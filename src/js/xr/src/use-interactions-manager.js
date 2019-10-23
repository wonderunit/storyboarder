const { useMemo, useRef, useEffect } = React = require('react')
const { useThree, useRender } = require('react-three-fiber')
const { useSelector, useDispatch } = require('react-redux')
const useReduxStore = require('react-redux').useStore

const { create } = require('zustand')
const { produce } = require('immer')

const { ActionCreators } = require('redux-undo')

const useVrControllers = require('./hooks/use-vr-controllers')

const { log } = require('./components/Log')

const {
  getControllerRaycaster,
  getControllerIntersections
} = require('./helpers/get-controller-intersections')
const findMatchingAncestor = require('./helpers/find-matching-ancestor')
const rotatePoint = require('./helpers/rotate-point')
const teleportParent = require('./helpers/teleport-parent')
const applyDeviceQuaternion = require('../../shot-generator/apply-device-quaternion')

const BonesHelper = require('./three/BonesHelper')
const GPUPicker = require('./three/GPUPickers/GPUPicker')
const IKHelper = require('../../shared/IK/IkHelper')

const { useMachine } = require('@xstate/react')
const interactionMachine = require('./machines/interactionMachine')
const {dropObject, dropCharacter } = require('./utils/dropToObjects')

require('./three/GPUPickers/utils/Object3dExtension')

const {
  // selectors
  getSelections,
  getSelectedBone,

  // action creators
  selectObject,
  updateObject,
  updateCharacterSkeleton,
  updateCharacterIkSkeleton,
  updateCharacterPoleTargets,
  selectBone
} = require('../../shared/reducers/shot-generator')

const WORLD_SCALE_LARGE = 1
const WORLD_SCALE_SMALL = 0.1

const getRotationMemento = (controller, object) => {
  let controllerRot = new THREE.Matrix4().extractRotation(controller.matrixWorld)
  let startingDeviceRotation = new THREE.Quaternion().setFromRotationMatrix(controllerRot)
  let startingDeviceOffset = new THREE.Quaternion()
    .clone()
    .inverse()
    .multiply(startingDeviceRotation)
    .normalize()
    .inverse()

  let startingObjectQuaternion = object.quaternion.clone()
  let startingObjectOffset = new THREE.Quaternion()
    .clone()
    .inverse()
    .multiply(startingObjectQuaternion)

  return {
    startingDeviceOffset,
    startingObjectOffset,
    startingObjectQuaternion
  }
}

const getSelectOffset = (controller, object, distance, point) => {
  let cursor = controller.getObjectByName('cursor')
  cursor.position.z = -distance
  const pos = object.getWorldPosition(new THREE.Vector3())
  const offset = new THREE.Vector3().subVectors(point, pos)
  return offset
}

const moveObjectZ = (object, event, worldScale) => {
  if (Math.abs(event.axes[1]) < Math.abs(event.axes[0])) return

  const amount = event.axes[1] * 0.08

  if (Math.abs(amount) > 0.01) {
    const worldScaleMult = worldScale === 1 ? 1 : worldScale * 2

    object.position.add(new THREE.Vector3(0, 0, amount * worldScaleMult))
    object.position.z = Math.min(object.position.z, -0.5 * worldScaleMult)
  }
}

const rotateObjectY = (object, event) => {
  if (Math.abs(event.axes[0]) < Math.abs(event.axes[1])) return

  const amount = event.axes[0] * 0.07

  if (Math.abs(amount) > 0.01) {
    object.rotateY(amount)
  }
}

const snapObjectRotation = (object) => {
  // setup for rotation
  object.userData.order = object.rotation.order
  object.rotation.reorder('YXZ')

  // snap rotation y by 22.5°
  const sign = Math.sign(object.rotation.y)
  let degreeY = THREE.Math.radToDeg(Math.abs(object.rotation.y)) / 22.5
  degreeY = THREE.Math.degToRad(Math.round(degreeY) * 22.5) * sign
  // snap rotation z to 180°
  let degreeZ = THREE.Math.radToDeg(Math.abs(object.rotation.z)) / 180
  degreeZ = THREE.Math.degToRad(Math.round(degreeZ) * 180)

  let euler = new THREE.Euler(0, degreeY, 0)
  euler.reorder('YXZ')

  // update rotation
  object.rotation.copy(euler)
  object.rotation.order = object.userData.order
  object.updateMatrix()
  object.updateMatrixWorld()
}

const teleportState = ({ teleportPos, teleportRot }, camera, x, y, z, r) => {
  // create virtual parent and child
  let parent = new THREE.Object3D()
  parent.position.set(teleportPos.x, teleportPos.y, teleportPos.z)
  parent.rotation.set(teleportRot.x, teleportRot.y, teleportRot.z)

  let child = new THREE.Object3D()
  child.position.copy(camera.position)
  child.rotation.copy(camera.rotation)
  parent.add(child)
  parent.updateMatrixWorld()

  // teleport the virtual parent
  teleportParent(parent, child, x, y, z, r)

  // update state from new position of virtual parent
  teleportPos.x = parent.position.x
  teleportPos.y = parent.position.y
  teleportPos.z = parent.position.z

  let rotationToApply = parent.rotation;
  teleportRot.x = rotationToApply.x
  teleportRot.y = rotationToApply.y
  teleportRot.z = rotationToApply.z
}

const [useStore, useStoreApi] = create((set, get) => ({
  // values
  teleportPos: { x: 0, y: 0, z: 0 },
  teleportRot: { x: 0, y: 0, z: 0 },

  worldScale: WORLD_SCALE_LARGE,
  standingMemento: null,

  didMoveCamera: null,
  didRotateCamera: null,

  teleportMaxDist: 20,
  teleportTargetPos: [0, 0, 0],
  teleportTargetValid: false,

  boneRotationMemento: {},

  // actions
  setDidMoveCamera: value => set(produce(state => { state.didMoveCamera = value })),
  setDidRotateCamera: value => set(produce(state => { state.didRotateCamera = value })),

  moveCameraByDistance: (camera, distance) => set(produce(state => {
    let center = new THREE.Vector3()
    camera.getWorldPosition(center)
    let gr = camera.rotation.y + state.teleportRot.y

    let target = new THREE.Vector3(center.x, 0, center.z + distance)
    let d = rotatePoint(target, center, -gr)
    teleportState(state, camera, d.x, null, d.z, null)
  })),

  rotateCameraByRadians: (camera, radians) => set(produce(state => {
    let center = new THREE.Vector3()
    camera.getWorldPosition(center)
    let gr = camera.rotation.y + state.teleportRot.y

    teleportState(state, camera, null, null, null, gr + radians)
  })),

  teleport: (camera, x, y, z, r) => set(produce(state => {
    teleportState(state, camera, x, y, z, r)
  })),


  setMiniMode: (value, camera) => set(produce(state => {
    if (value) {
      // switch to mini mode
      state.worldScale = WORLD_SCALE_SMALL

      // alter the camera position
      let offsetVector = new THREE.Vector3(0, 0, 0.5)
      offsetVector.applyMatrix4(new THREE.Matrix4().extractRotation(camera.matrixWorld))
      offsetVector = offsetVector.multiply(new THREE.Vector3(1, 0, 1))

      teleportState(state, camera,
        (state.teleportPos.x + camera.position.x) * state.worldScale + offsetVector.x,
        -(camera.position.y - 0.75),
        (state.teleportPos.z + camera.position.z) * state.worldScale + offsetVector.z
      )
    } else {
      // set the world scale
      state.worldScale = WORLD_SCALE_LARGE
    }
  })),

  // remember where we were standing
  saveStandingMemento: camera => set(state => {
    let v = new THREE.Vector3()
    camera.getWorldPosition(v)

    return {
      ...state,

      standingMemento: {
        position: {
          x: v.x,
          y: 0,
          z: v.z
        }
      }
    }
  }),

  // return to where we were standing
  restoreStandingMemento: camera => set(state => produce(state, draft => {
    if (state.standingMemento) {
      let { x, z } = state.standingMemento.position

      teleportState(draft, camera, x, 0, z, null)
    }
  })),

  // clear the memento
  clearStandingMemento: () => set(state => ({ ...state,
    standingMemento: null
  })),

  set: fn => set(produce(fn))
}))

const getExcludeList = parent => {
  let list = []
  parent.traverse(child => {
    if (child.userData.preventInteraction) {
      list.push(child)
    }
  })
  return list
}

const useInteractionsManager = ({
  groundRef,
  rootRef,
  uiService,
  playSound,
  stopSound
}) => {
  const { gl, camera, scene } = useThree()


  const selections = useSelector(getSelections)

  const canUndo = useSelector(state => state.undoable.past.length > 0)
  const canRedo = useSelector(state => state.undoable.future.length > 0)

  const gpuPicker = useRef(null)
  const getGpuPicker = () => {
    if (gpuPicker.current === null) {
      gpuPicker.current = new GPUPicker(gl)
    }
    return gpuPicker.current
  }

  const ikHelper = useRef(null)
  const getIkHelper = () => {
    if(ikHelper.current === null) {
      ikHelper.current = IKHelper.getInstance()
      const updateCharacterSkeleton = (name, rotation) => { dispatch(updateCharacterSkeleton({
        id: ikHelper.current.intializedSkinnedMesh.parent.parent.userData.id,
        name : name,
        rotation: 
        {
          x : rotation.x,
          y : rotation.y,
          z : rotation.z,
        }  
      } ))}

      const updateSkeleton = (skeleton) => { dispatch(updateCharacterIkSkeleton({
        id: ikHelper.current.intializedSkinnedMesh.parent.parent.userData.id,
        skeleton: skeleton  
      } ))}

      const updateCharacterPos = ({ x, y, z}) => dispatch(updateObject(
        ikHelper.current.intializedSkinnedMesh.parent.parent.userData.id,
        { x, y: z, z: y }
      ))

      const updatePoleTarget = (poleTargets) => dispatch(updateCharacterPoleTargets({
          id: ikHelper.current.intializedSkinnedMesh.parent.parent.userData.id,
          poleTargets: poleTargets
        }
      ))

      ikHelper.current.setUpdate(
        updateCharacterSkeleton,
        updateSkeleton,
        updateCharacterPos,
        updatePoleTarget
      )
    }
    return ikHelper.current 
  }
  
  useEffect(() => {
    // create a temporary mesh object to initialize the GPUPicker
    let gpuPicker = getGpuPicker()
    let geometry = new THREE.BoxBufferGeometry(2, 2, 2)
    let material = new THREE.MeshBasicMaterial();
    let mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(camera.worldPosition())
    mesh.position.z -= 1
    scene.add(mesh)
    let interactions = scene.__interaction.concat([mesh])
    gpuPicker.setupScene(interactions, getExcludeList(scene))
    let gpuCamera = gpuPicker.camera
    gpuCamera.fov = 360
    gpuCamera.updateProjectionMatrix()
    gpuPicker.pick(camera.worldPosition(), camera.worldQuaternion())
    scene.remove(mesh)
    gpuCamera.fov = 1
    gpuCamera.updateProjectionMatrix()
  }, [])

  // values
  const didMoveCamera = useStore(state => state.didMoveCamera)
  const didRotateCamera = useStore(state => state.didRotateCamera)
  const teleportTargetValid = useStore(state => state.teleportTargetValid)
  const teleportMaxDist = useStore(state => state.teleportMaxDist)

  // actions
  const setDidMoveCamera = useStore(state => state.setDidMoveCamera)
  const setDidRotateCamera = useStore(state => state.setDidRotateCamera)
  const moveCameraByDistance = useStore(state => state.moveCameraByDistance)
  const rotateCameraByRadians = useStore(state => state.rotateCameraByRadians)
  const teleport = useStore(state => state.teleport)
  const setMiniMode = useStore(state => state.setMiniMode)
  const saveStandingMemento = useStore(state => state.saveStandingMemento)
  const restoreStandingMemento = useStore(state => state.restoreStandingMemento)
  const clearStandingMemento = useStore(state => state.clearStandingMemento)
  const set = useStore(state => state.set)

  const store = useReduxStore()
  const dispatch = useDispatch()

  const commit = (id, object) => {
    const euler = new THREE.Euler().setFromQuaternion(object.quaternion, 'YXZ')

    if (object.userData.type == 'light' || object.userData.type == 'virtual-camera') {
      dispatch(updateObject(id, {
        x: object.position.x,
        y: object.position.z,
        z: object.position.y,
        rotation: euler.y,
        roll: euler.z,
        tilt: euler.x
      }))
    } else {
      let rotation = object.userData.type == 'character'
        ? euler.y
        : { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z }
      dispatch(updateObject(id, {
        x: object.position.x,
        y: object.position.z,
        z: object.position.y,
        rotation
      }))
    }
  }

  const onTriggerStart = event => {
    const controller = event.target
    let intersection = null

    let uis = scene.__interaction.filter(o => o.userData.type == 'ui')
    let intersections = getControllerIntersections(controller, uis)
    intersection = intersections.length && intersections[0]
    //console.log(intersection)
    if (intersection) {
      let u = intersection.uv.x
      let v = intersection.uv.y
      uiService.send({
        type: 'TRIGGER_START',
        controller: event.target,
        intersection: {
          id: intersection.object.userData.id,
          type: 'ui',

          object: intersection.object,
          distance: intersection.distance,
          point: intersection.point,
          uv: intersection.uv
        }
      })
      return
    }



    // if the BonesHelper instance is in the scene ...
    if ( BonesHelper.getInstance().isSelected ) {
      // ... check bones helper bone intersections

      let intersects = []
      BonesHelper.getInstance().raycast(getControllerRaycaster(controller), intersects)
      intersection = intersects.find(h => h.bone)

      if (intersection) {
        interactionService.send({
          type: 'TRIGGER_START',
          controller: event.target,
          intersection: {
            id: intersection.object.userData.id,
            type: 'bone',

            object: intersection.object,
            distance: intersection.distance,
            point: intersection.point,

            bone: intersection.bone
          }
        })
        return
      }

      intersection = getControllerIntersections(controller, [IKHelper.getInstance()]).find(h => h.isControlTarget)
      if (intersection) {
        interactionService.send({
          type: 'TRIGGER_START',
          controller: event.target,
          intersection: {
            id: intersection.object.uuid,
            type: 'controlPoint',
            object: intersection.object,
            distance: intersection.distance,
            point: intersection.point,
            controlPoint: intersection.object
          }
        })
        return
      }
    }

    let match = null

    // include all interactables (Model Object, Character, Virtual Camera, etc)
    let list = scene.__interaction

    // setup the GPU picker
    getGpuPicker().setupScene(list, getExcludeList(scene))

    // gather all hits to tracked scene object3ds
    let hits = getGpuPicker().pick(controller.worldPosition(), controller.worldQuaternion())

    // if one intersects
    if (hits.length) {
      // grab the first intersection
      let child = hits[0].object
      // find either the child or one of its parents on the list of interaction-ables
      match = findMatchingAncestor(child, list)
      if (match) {
        intersection = hits[0]
      }
    }

    if (match) {
      // console.log('found sceneObject:', sceneObjects[match.userData.id])
      // console.log('intersection', intersection)
      // log(`select ${sceneObjects[match.userData.id].name || sceneObjects[match.userData.id].displayName}`)
      log(`trigger start on: ${match.userData.id.slice(0, 7)}`)

      interactionService.send({
        type: 'TRIGGER_START',
        controller: event.target,
        intersection: {
          id: match.userData.id,
          type: match.userData.type,
          object: match,
          distance: intersection.distance,
          point: intersection.point
        }
      })
    } else {
      // console.log('clearing selection')
      log(`trigger start on: none`)
      interactionService.send({ type: 'TRIGGER_START', controller: event.target })
    }
  }

  const onTriggerEnd = event => {
    const controller = event.target

    let intersection = null

    let uis = scene.__interaction.filter(o => o.userData.type == 'ui')
    let intersections = getControllerIntersections(controller, uis)
    intersection = intersections.length && intersections[0]
    if (intersection) {
      let u = intersection.uv.x
      let v = intersection.uv.y
      uiService.send({
        type: 'TRIGGER_END',
        controller: event.target,
        intersection: {
          id: intersection.object.userData.id,
          type: 'ui',

          object: intersection.object,
          distance: intersection.distance,
          point: intersection.point,
          uv: intersection.uv
        }
      })
    } else {
      uiService.send({
        type: 'TRIGGER_END',
        controller: event.target
      })
    }

    interactionService.send({ type: 'TRIGGER_END', controller: event.target })
  }

  const onGripDown = event => {
    const controller = event.target
    if (BonesHelper.getInstance().isSelected) {

      let intersects = []
      BonesHelper.getInstance().raycast(getControllerRaycaster(controller), intersects)
      intersection = intersects.find(h => h.bone)

      if (intersection) {
        interactionService.send({
          type: 'GRIP_DOWN',
          controller: event.target,

          intersection: intersection ? { ...intersection, type: 'bone' } : undefined
        })
        return
      }
    }

    let match = null

    // include all interactables (Model Object, Character, etc)
    let list = scene.__interaction

    // checks if any object is being actively dragged
    // if so, there's no reason to pick any other object except for dragged one
    if (
      interactionService.state.context.draggingController &&
      interactionService.state.context.selection
    ) {
      list = list.filter(object => object.uuid === interactionService.state.context.selection)
    }
    // setup the GPU picker
    getGpuPicker().setupScene(list, getExcludeList(scene))

    // gather all hits to tracked scene object3ds
    let hits = getGpuPicker().pick(controller.worldPosition(), controller.worldQuaternion())
    // if one intersects
    if (hits.length) {
      // grab the first intersection
      let child = hits[0].object
      // find either the child or one of its parents on the list of interaction-ables
      match = findMatchingAncestor(child, list)
      if (match) {
        intersection = hits[0]
      }
    }

    if (match) {
      // Simple test to check how drop works
      interactionService.send({
        type: 'GRIP_DOWN',
        controller: event.target,

        intersection: {
          id: match.userData.id,
          type: match.userData.type,
          object: match,
          distance: intersection.distance,
          point: intersection.point
        }
      })
    } else {
      interactionService.send({
        type: 'GRIP_DOWN',
        controller: event.target,

        intersection: undefined
      })
    }
  }

  const onGripUp = event => {
    interactionService.send({ type: 'GRIP_UP', controller: event.target })
  }

  const onAxesChanged = event => {
    interactionService.send({ type: 'AXES_CHANGED', controller: event.target, axes: event.axes })
  }

  const onPressEndA = event => {
    // to relay through state machine instead:
    // interactionService.send({ type: 'PRESS_END_A', controller: event.target })

    if (canUndo) {
      dispatch(ActionCreators.undo())
      playSound('undo')
    }
  }

  const onPressEndB = event => {
    // to relay through state machine instead:
    // interactionService.send({ type: 'PRESS_END_B', controller: event.target })

    if (canRedo) {
      dispatch(ActionCreators.redo())
      playSound('redo')
    }
  }

  const onPressEndX = event => {
    // relay through state machine
    interactionService.send({ type: 'PRESS_END_X', controller: event.target })
  }

  const onPressEndY = event => {
    // relay through state machine
    interactionService.send({ type: 'PRESS_END_Y', controller: event.target })
  }

  const onMoveCamera = event => {
    if (didMoveCamera != null) {
      if (event.axes[1] === 0) {
        setDidMoveCamera(null)
      }
    } else {
      if (Math.abs(event.axes[1]) < Math.abs(event.axes[0])) return

      let distance
      let value = event.axes[1]

      // backward
      if (value > 0.075) {
        distance = +0.5
      }

      // forward
      if (value < -0.075) {
        distance = -0.5
      }

      if (distance != null) {
        setDidMoveCamera(distance)
        moveCameraByDistance(camera, distance)
        playSound('teleport-move')
      }
    }
  }

  const onRotateCamera = event => {
    if (didRotateCamera != null) {
      if (event.axes[0] === 0) {
        setDidRotateCamera(null)
      }
    } else {
      if (Math.abs(event.axes[0]) < Math.abs(event.axes[1])) return

      // right
      if (event.axes[0] > 0.075) {
        setDidRotateCamera(-45)
        playSound('teleport-rotate')
        rotateCameraByRadians(camera, THREE.Math.degToRad(-45))
      }

      // left
      if (event.axes[0] < -0.075) {
        setDidRotateCamera(45)
        playSound('teleport-rotate')
        rotateCameraByRadians(camera, THREE.Math.degToRad(45))
      }
    }
  }

  // controller state via THREE.VRController
  const controllers = useVrControllers({
    onTriggerStart,
    onTriggerEnd,
    onGripDown,
    onGripUp,
    onAxesChanged,
    onPressEndA,
    onPressEndB,
    onPressEndX,
    onPressEndY
  })

  const reusableVector = useRef()
  const getReusableVector = () => {
    if (!reusableVector.current) {
      reusableVector.current = new THREE.Vector3()
    }
    return reusableVector.current
  }

  // TODO could model these as ... activities? exec:'render' actions?
  useRender(() => {
    // don't wait for a React update
    // read values directly from stores
    let selections = getSelections(store.getState())
    let selectedId = selections.length ? selections[0] : null

    let mode = interactionService.state.value
    let context = interactionService.state.context

    // highlight hovered bone
    if (mode == 'selected') {
      let match
      for (let i = 0, n = controllers.length; i < n; i++) {
        let controller = controllers[i]

        let intersects = []
        BonesHelper.getInstance().raycast(getControllerRaycaster(controller), intersects)
        intersection = intersects.find(h => h.bone)

        if (intersection) {
          match = intersection
          if (BonesHelper.getInstance().selectedBone !== intersection.bone) {
            playSound('bone-hover')
            BonesHelper.getInstance().selectBone(intersection.bone)
          }
        }
      }
      if (!match) {
        BonesHelper.getInstance().resetSelection()
      }
    }

    if (mode === 'drag_teleport') {
      let controller = gl.vr.getController(context.teleportDragController)

      let hits = getControllerIntersections(controller, [groundRef.current])
      if (hits.length) {
        let hit = hits[0]
        if (hit.distance < teleportMaxDist) {
          let worldScale = useStoreApi.getState().worldScale

          let teleportTargetPos = hit.point.multiplyScalar(1 / worldScale).toArray()

          set(state => ({ ...state, teleportTargetPos, teleportTargetValid: true }))
        } else {
          set(state => ({ ...state, teleportTargetValid: false }))
        }
      }
    }

    if (mode == 'drag_object') {
      let controller = gl.vr.getController(context.draggingController)
      let object3d = scene.__interaction.find(o => o.userData.id === context.selection)

      let shouldMoveWithCursor = (object3d.userData.type == 'character') || object3d.userData.staticRotation
      if (shouldMoveWithCursor) {

        // update position via cursor
        const cursor = controller.getObjectByName('cursor')
        let wp = cursor.getWorldPosition(getReusableVector())
        if (controller.userData.selectOffset && object3d.userData.type == 'character') {
          wp.sub(controller.userData.selectOffset)
          object3d.applyMatrix(object3d.parent.matrixWorld)
          object3d.position.copy(wp)
          object3d.updateMatrixWorld()
          object3d.applyMatrix(object3d.parent.getInverseMatrixWorld())
        }

        if (object3d.userData.staticRotation) {
          let quaternion = object3d.parent.worldQuaternion().inverse()
          let rotation = quaternion.multiply(object3d.userData.staticRotation)
          object3d.quaternion.copy(rotation)
        }
        object3d.updateMatrixWorld()

        //object3d.updateMatrix()
      }
    }

    if (mode == 'rotate_bone') {
      let controller = gl.vr.getController(context.draggingController)
      let selectedBone = getSelectedBone(store.getState())

      // find the bone
      let bone = scene.getObjectByProperty('uuid', selectedBone)

      let {
        startingDeviceOffset,
        startingObjectOffset,
        startingObjectQuaternion
      } = useStoreApi.getState().boneRotationMemento

      let currControllerRot = new THREE.Matrix4().extractRotation(controller.matrixWorld)
      let deviceQuaternion = new THREE.Quaternion().setFromRotationMatrix(currControllerRot)

      let objectQuaternion = applyDeviceQuaternion({
        parent: bone.parent,

        startingDeviceOffset,
        startingObjectOffset,
        startingObjectQuaternion,

        deviceQuaternion,

        camera,
        useCameraOffset: true
      })

      bone.quaternion.copy(objectQuaternion.normalize())
    }
  }, false, [set, controllers])

  // update ui every frame
  useRender(() => {
    if (uiService.state.value.input == 'dragging') {
      let controller = uiService.state.context.draggingController

      let uis = scene.__interaction.filter(o => o.userData.type == 'ui')
      let intersections = getControllerIntersections(controller, uis)
      let intersection = intersections.length && intersections[0]

      if (intersection) {
        let u = intersection.uv.x
        let v = intersection.uv.y
        uiService.send({
          type: 'CONTROLLER_INTERSECTION',
          controller,
          intersection
        })
      }
    }
  }, false, [uiService.state.value.input])

  useMemo(() => {
    // TODO why is this memo called multiple times?
    console.log('useInteractionsManager')
  }, [])

  const [interactionServiceCurrent, interactionServiceSend, interactionService] = useMachine(
    interactionMachine,
    {
      actions: {
        onDragTeleportStart: (context, event) => {
          log('-- onDragTeleportStart')
          // the target position value will be old until the next gl render
          // so consider teleportTargetValid to be false, to hide the mesh, until then
          set(state => ({ ...state, teleportTargetValid: false }))
        },
        onDragTeleportEnd: (context, event) => {
          log('-- onDragTeleportEnd')
          set(state => ({ ...state, teleportTargetValid: false }))
        },
        onTeleport: (context, event) => {
          log('-- teleport')
          if (teleportTargetValid) {
            let pos = useStoreApi.getState().teleportTargetPos

            // world scale is always reset to large
            setMiniMode(false, camera)

            // reposition
            teleport(camera, pos[0], 0, pos[2], null)

            // clear any prior memento
            clearStandingMemento()

            playSound('teleport')
          }
        },
        onPosingCharacterEntry: (context, event) => {
          console.log("Posing started");
          if(context.selectionType !== "character") return
          let ikHelper = getIkHelper()
          let headControlPoint = ikHelper.getControlPointByName("Head")
          let leftArmControlPoint = ikHelper.getControlPointByName("LeftHand")
          let rightArmControlPoint = ikHelper.getControlPointByName("RightHand")
          setMiniMode(false, camera)

          let worldPosition = headControlPoint.worldPosition()
          let worldRotation = ikHelper.intializedSkinnedMesh.skeleton.bones[5].worldQuaternion()
          camera.parent.userData.prevPosition = useStoreApi.getState().teleportPos
          camera.parent.userData.prevQuaternion = useStoreApi.getState().teleportRot
          teleport(camera, worldPosition.x, worldPosition.y - camera.position.y, worldPosition.z, worldRotation.y + 180)
          getIkHelper().ragDoll.isEnabledIk = true;
          camera.attach(headControlPoint);

          if(controllers[0] && controllers[0].userData.gamepad.index === 0)
          {
            leftArmControlPoint.quaternion.premultiply(controllers[0].worldQuaternion().inverse());
            leftArmControlPoint.position.set(0, 0, 0);
            leftArmControlPoint.updateMatrixWorld();
            controllers[0].add(leftArmControlPoint);
          }
          if(controllers[1] && controllers[1].userData.gamepad.index === 1)
          {
            rightArmControlPoint.quaternion.premultiply(controllers[1].worldQuaternion().inverse());
            rightArmControlPoint.position.set(0, 0, 0);
            rightArmControlPoint.updateMatrixWorld();
            controllers[1].add(rightArmControlPoint);
          }
          clearStandingMemento()

          playSound('teleport')
        },
        onPosingCharacterExit: (context, event) => {
          console.log("Posing stopped");
          let ikHelper = getIkHelper()
          let headControlPoint = ikHelper.getControlPointByName("Head")
          let leftArmControlPoint = ikHelper.getControlPointByName("LeftHand")
          let rightArmControlPoint = ikHelper.getControlPointByName("RightHand")
          getIkHelper().ragDoll.isEnabledIk = false;
          ikHelper.controlPoints.attach(headControlPoint)
          ikHelper.controlPoints.attach(leftArmControlPoint)
          ikHelper.controlPoints.attach(rightArmControlPoint)
          useStoreApi.setState({teleportPos : {x, y, z} = camera.parent.userData.prevPosition} )
          useStoreApi.setState({teleportRot : {x, y, z, w} = camera.parent.userData.prevQuaternion} )
        },
        onDropLowest: (context, event) => {
          let object = scene.__interaction.find(o => o.userData.id === context.selection)
          let placesForDrop = scene.__interaction.concat([groundRef.current])

          if (object.userData.type === 'character') {
            let positionDifference = object.worldPosition().clone()
            dropCharacter(object, placesForDrop)
            positionDifference.sub(object.worldPosition())

            // if a controller is dragging the character ...
            if (context.draggingController != null) {
              // ... find out which controller it is
              let controller = gl.vr.getController(context.draggingController)
              // ... and add the difference to that controller's selectOffset
              controller.userData.selectOffset.add(positionDifference)
            }
          } else {
            dropObject(object, placesForDrop)
          }

          // if we're in `selected` mode, we can commit the change immediately
          if (interactionService.state.value === 'selected') {
            commit(context.selection, object)
          }

          playSound('drop')
        },
        onSelected: (context, event) => {
          let controller = event.controller
          let { object, distance, point } = event.intersection
          log('-- onSelected')
          // selectOffset is used for Character
          controller.userData.selectOffset = getSelectOffset(controller, object, distance, point)
          dispatch(selectObject(context.selection))

          playSound('select')
        },

        onSelectNone: (context, event) => {
          let controller = event.controller
          log('-- onSelectNone', controller)

          controller.userData.selectOffset = null
          dispatch(selectObject(null))
          BonesHelper.getInstance().resetSelection()
        },

        onDragControlPointEntry: (context, event) =>
        {
          let controller = gl.vr.getController(context.draggingController)
          let object = event.intersection.object
          getIkHelper().selectControlPoint(object.name)
          controller.attach(object)
        },
        moveAndRotateControlPoint: (context, event) =>
        {
          let selectedControlTarget = getIkHelper().selectedControlPoint
          let { worldScale } = useStoreApi.getState()
          moveObjectZ(selectedControlTarget, event, worldScale)
        },
        onDragControlPointExit: (context, event) =>
        {
          getIkHelper().deselectControlPoint()
        },

        onDragObjectEntry: (context, event) => {
          let controller = gl.vr.getController(context.draggingController)
          let object = event.intersection.object

          if (object.userData.type != 'character') {
            controller.attach(object)
            object.updateMatrixWorld(true)
          }

          playSound('beam', object)

          uiService.send({ type: 'LOCK' })
        },
        onDragObjectExit: (context, event) => {
          let controller = gl.vr.getController(context.draggingController)
          let object = scene.__interaction.find(o => o.userData.id === context.selection)

          let root = rootRef.current
          if (object.parent != root) {
            root.attach(object)
            object.updateMatrixWorld()
          }

          stopSound('beam', object)

          commit(context.selection, object)

          uiService.send({ type: 'UNLOCK' })
        },
        onSnapStart: (context, event) => {
          let controller = gl.vr.getController(context.draggingController)
          let object = scene.__interaction.find(o => o.userData.id === context.selection)

          let root = rootRef.current
          // put object in root space
          root.attach(object)
          object.updateMatrixWorld(true)

          // rotate
          snapObjectRotation(object)
          object.userData.staticRotation = object.quaternion.clone()

          // put object in controller space
          controller.attach(object)
          object.updateMatrixWorld(true)
        },
        onSnapEnd: (context, event) => {
          let controller = gl.vr.getController(context.draggingController)
          let object = scene.__interaction.find(o => o.userData.id === context.selection)

          if (object.userData.staticRotation) {
            object.userData.staticRotation = null
          }
        },

        moveAndRotateCamera: (context, event) => {
          onMoveCamera(event)
          onRotateCamera(event)
        },

        moveAndRotateObject: (context, event) => {
          let controller = gl.vr.getController(context.draggingController)
          let object = scene.__interaction.find(o => o.userData.id === context.selection)
          let { worldScale } = useStoreApi.getState()

          let shouldMoveWithCursor = (object.userData.type == 'character')
          let target = shouldMoveWithCursor
            ? controller.getObjectByName('cursor')
            : object
          moveObjectZ(target, event, worldScale)

          rotateObjectY(object, event, controller)
        },


        onRotateBoneEntry: (context, event) => {
          let controller = event.controller
          let bone = event.intersection.bone

          useStoreApi.setState({
            boneRotationMemento: getRotationMemento(controller, bone)
          })

          // select by UUID, like shot generator does
          dispatch(selectBone(bone.uuid))
          BonesHelper.getInstance().selectBone(bone)

          playSound('bone-click')

          let parent
          bone.traverseAncestors(ancestor => {
            if (parent == null && ancestor.userData.type == 'character') {
              parent = ancestor
            }
          })
          playSound('bone-drone', parent)
        },
        onRotateBoneExit: (context, event) => {
          useStoreApi.setState({
            boneRotationMemento: {}
          })

          let selectedBone = getSelectedBone(store.getState())
          let bone = scene.getObjectByProperty('uuid', selectedBone)

          let parent
          bone.traverseAncestors(ancestor => {
            if (parent == null && ancestor.userData.type == 'character') {
              parent = ancestor
            }
          })

          let rotation = new THREE.Euler()
          rotation.setFromQuaternion(bone.quaternion.clone().normalize(), 'XYZ')

          let id = parent.userData.id
          let name = bone.name

          // TODO wrap in an undo group
          dispatch(
            updateCharacterSkeleton({
              id,
              name,
              rotation: {
                x: rotation.x,
                y: rotation.y,
                z: rotation.z
              }
            })
          )
          dispatch(selectBone(null))
          BonesHelper.getInstance().resetSelection()

          stopSound('bone-drone', parent)
        },

        onToggleMiniMode: (context, event) => {
          let { worldScale } = useStoreApi.getState()

          if (worldScale === WORLD_SCALE_LARGE) {
            saveStandingMemento(camera)

            setMiniMode(true, camera)
            getIkHelper().isInMiniMode(true)
          } else {
            setMiniMode(false, camera)
            getIkHelper().isInMiniMode(false)

            restoreStandingMemento(camera)
            clearStandingMemento()
          }
        }
      },

      // services: {
      //   example: (context, event) => new Promise(resolve => {
      //     console.log('an example service')
      //     resolve()
      //   })
      // },

      logger: log
    }
  )

  return { controllers, interactionServiceCurrent }
}

module.exports = {
  useStore,
  useStoreApi,
  useInteractionsManager,
  WORLD_SCALE_LARGE,
  WORLD_SCALE_SMALL
}
