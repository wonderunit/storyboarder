const { useMemo, useState } = React = require('react')
const { useThree, useRender } = require('react-three-fiber')
const { useSelector, useDispatch } = require('react-redux')
const useReduxStore = require('react-redux').useStore

const { create } = require('zustand')
const { produce } = require('immer')

const useVrControllers = require('./hooks/use-vr-controllers')

const { log } = require('./components/Log')

const getControllerIntersections = require('./helpers/get-controller-intersections')
const findMatchingAncestor = require('./helpers/find-matching-ancestor')
const rotatePoint = require('./helpers/rotate-point')
const teleportParent = require('./helpers/teleport-parent')

const BonesHelper = require('./three/BonesHelper')

const { interpret } = require('xstate/lib/interpreter')
const interactionMachine = require('./machines/interactionMachine')

const {
  // selectors
  getSelections,

  // action creators
  selectObject,
  updateObject
} = require('../../shared/reducers/shot-generator')

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

  teleportRot.x = parent.rotation.x
  teleportRot.y = parent.rotation.y
  teleportRot.z = parent.rotation.z
}

const [useStore, useStoreApi] = create((set, get) => ({
  // values
  teleportPos: { x: 0, y: 0, z: 0 },
  teleportRot: { x: 0, y: 0, z: 0 },

  didMoveCamera: null,
  didRotateCamera: null,

  teleportMaxDist: 10,
  teleportMode: false,
  teleportTargetPos: [0, 0, 0],
  teleportTargetValid: false,

  // actions
  setDidMoveCamera: value => set(produce(state => { state.didMoveCamera = value })),
  setDidRotateCamera: value => set(produce(state => { state.didRotateCamera = value })),
  setTeleportMode: value => set(state => ({ ...state, teleportMode: value })),

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

  set: fn => set(produce(fn))
}))

const useInteractionsManager = ({
  groundRef
}) => {
  const { gl, camera, scene } = useThree()

  const selections = useSelector(getSelections)

  // values
  const didMoveCamera = useStore(state => state.didMoveCamera)
  const didRotateCamera = useStore(state => state.didRotateCamera)
  const teleportMode = useStore(state => state.teleportMode)
  const teleportTargetValid = useStore(state => state.teleportTargetValid)
  const teleportMaxDist = useStore(state => state.teleportMaxDist)

  // actions
  const setDidMoveCamera = useStore(state => state.setDidMoveCamera)
  const setDidRotateCamera = useStore(state => state.setDidRotateCamera)
  const moveCameraByDistance = useStore(state => state.moveCameraByDistance)
  const rotateCameraByRadians = useStore(state => state.rotateCameraByRadians)
  const teleportFn = useStore(state => state.teleport)
  const teleport = (x, y, z, r) => teleportFn(camera, x, y, z, r)
  const setTeleportMode = useStore(state => state.setTeleportMode)
  const set = useStore(state => state.set)

  const store = useReduxStore()
  const dispatch = useDispatch()

  const oppositeController = controller => controllers.find(i => i.uuid !== controller.uuid)

  const onTriggerStart = event => {
    const controller = event.target

    let match = null
    let intersection = null

    // DEBUG test bones helper bone intersections
    intersection = getControllerIntersections(controller, [BonesHelper.getInstance()]).find(h => h.bone)
    if (intersection) {
      interactionService.send({
        type: 'TRIGGER_START',
        controller: event.target,
        intersection: {
          id: intersection.bone.uuid,
          type: 'bone',
          // TODO
          object: intersection.bone,
          distance: intersection.distance,
          point: intersection.point,

          bone: intersection.bone
        }
      })
      return
    }

    // DEBUG include all interactables so we can test Character
    let list = scene.__interaction

    // gather all hits to tracked scene object3ds
    let hits = getControllerIntersections(controller, list)

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
    interactionService.send({ type: 'TRIGGER_END', controller: event.target })
  }

  const onGripDown = event => {
    interactionService.send({ type: 'GRIP_DOWN', controller: event.target })
  }

  const onGripUp = event => {
    interactionService.send({ type: 'GRIP_UP', controller: event.target })
  }

  const onAxesChanged = event => {
    interactionService.send({ type: 'AXES_CHANGED', controller: event.target, axes: event.axes })
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
        distance = +1
      }

      // forward
      if (value < -0.075) {
        distance = -1
      }

      if (distance != null) {
        setDidMoveCamera(distance)
        moveCameraByDistance(camera, distance)
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
        rotateCameraByRadians(camera, THREE.Math.degToRad(-45))
      }

      // left
      if (event.axes[0] < -0.075) {
        setDidRotateCamera(45)
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
    onAxesChanged
  })

  useRender(() => {
    // don't wait for a React update
    // read values directly from stores
    let teleportMode = useStoreApi.getState().teleportMode
    let selections = getSelections(store.getState())
    let selectedId = selections.length ? selections[0] : null

    let mode = interactionService.state.value
    let context = interactionService.state.context

    if (mode === 'drag_teleport') {
      let controller = gl.vr.getController(context.teleportDragController)

      let hits = getControllerIntersections(controller, [groundRef.current])
      if (hits.length) {
        let hit = hits[0]
        if (hit.distance < teleportMaxDist) {
          let teleportTargetPos = hit.point.toArray()
          set(state => ({ ...state, teleportTargetPos, teleportTargetValid: true }))
        } else {
          set(state => ({ ...state, teleportTargetValid: false }))
        }
      }
    }

    if (mode === 'drag_object') {
      let controller = gl.vr.getController(context.draggingController)
      let object3d = scene.__interaction.find(o => o.userData.id === context.selection)

      // TODO handle if object3d no longer exists
      //      e.g.: if scene was changed externally

      if (object3d) {
        // TODO position/rotate object3d based on controller3d

        // TODO constraints, snap

        // find the cursor
        let cursor = controller.getObjectByName('cursor')
        // make sure its position is exact
        controller.updateMatrixWorld()
        // grab its world position
        let wp = new THREE.Vector3()
        cursor.getWorldPosition(wp)
        // offset it
        wp.sub(controller.userData.selectOffset)
        // set the position
        object3d.position.copy(wp)

        // DEBUG added to test BonesHelper
        BonesHelper.getInstance().update()
        BonesHelper.getInstance().position.copy(wp)
      }
    }
  }, false, [set, controllers])

  useMemo(() => {
    // TODO why is this memo called multiple times?
    console.log('useInteractionManager')
  }, [])

  const interactionService = useMemo(() => {
    const interactionService = interpret(
      interactionMachine
    ).onEvent(e => {
      //
    }).onTransition((state, event) => {
      const { value } = state

      log(`${event.type} -> ${value}`)
    })

    interactionService.start()

    return interactionService
  }, [])

  interactionMachine.options.actions = {
    ...interactionMachine.options.actions,

    // TODO base hide/show on context and remove teleportMode and teleportTargetValid entirely
    onDragTeleportStart: (context, event) => {
      log('-- onDragTeleportStart')
      setTeleportMode(true)
      // the target position value will be old until the next gl render
      // so consider teleportTargetValid to be false, to hide the mesh, until then
      set(state => ({ ...state, teleportTargetValid: false }))
    },
    onDragTeleportEnd: (context, event) => {
      log('-- onDragTeleportEnd')
      setTeleportMode(false)
      set(state => ({ ...state, teleportTargetValid: false }))
    },
    onTeleport: (context, event) => {
      log('-- teleport')
      // TODO adjust by worldScale
      // TODO reset worldScale after teleport
      if (teleportTargetValid) {
        let pos = useStoreApi.getState().teleportTargetPos
        teleport(pos[0], 0, pos[2], null)
        // setTeleportMode(false)
      }
    },

    onSelected: (context, event) => {
      log('-- onSelected')
      if (
        event.intersection &&
        (event.intersection.type == 'object' || event.intersection.type == 'character'))
      {
        let controller = event.controller
        let { object, distance, point} = event.intersection

        let cursor = controller.getObjectByName('cursor')
        cursor.position.z = -distance
        const pos = object.getWorldPosition(new THREE.Vector3())
        const offset = new THREE.Vector3().subVectors(point, pos)
        controller.userData.selectOffset = offset

        dispatch(selectObject(context.selection))
      }
    },
    onSelectNone: (context, event) => {
      let controller = event.controller
      log('-- onSelectNone', controller)
      controller.userData.selectOffset = null

      dispatch(selectObject(null))
    },
    onSelectedBone: (context, event) => {
      let controller = event.controller
      log('-- onSelectBone', controller)
      controller.userData.selectOffset = null // TODO do we need this?

      console.log(context, event)
      log('bone')
    },

    onDragObjectEnd: (context, event) => {
      let controller = gl.vr.getController(context.draggingController)

      // find the cursor
      let cursor = controller.getObjectByName('cursor')
      // make sure its position is exact
      controller.updateMatrixWorld()
      // grab its world position
      let wp = new THREE.Vector3()
      cursor.getWorldPosition(wp)
      // offset it
      wp.sub(controller.userData.selectOffset)

      // TODO worldscale
      // TODO rotation
      // TODO soundBeam

      // console.log('updateObject', selections[0], wp.x, wp.y, wp.z)

      dispatch(updateObject(context.selection, {
        x: wp.x,
        y: wp.z,
        z: wp.y,
        // rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z }
      }))
    },

    moveAndRotateCamera: (context, event) => {
      onMoveCamera(event)
      onRotateCamera(event)
    }
  }

  // StateNode.withConfig doesn't accept services until xstate 4.6.7
  interactionMachine.options.services = {
    ...interactionMachine.options.services,

    // example: (context, event) => new Promise(resolve => {
    //   console.log('an example service')
    //   resolve()
    // }),
  }
}

module.exports = {
  useStore,
  useStoreApi,
  useInteractionsManager
}
