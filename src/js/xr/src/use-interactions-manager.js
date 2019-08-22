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

  const oppositeController = controller => dataControllers.find(i => i.uuid !== controller.uuid)

  const onSelectStart = event => {
    const controller = event.target
    controller.pressed = true

    if (teleportMode) {
      onTeleport()
      return
    }

    const other = oppositeController(controller)
    if (other && other.pressed) return
    if (other && other.gripped) return

    let match = null
    let intersection = null
    let list = scene.__interaction//.filter(object3d => object3d.userData.type != 'character')

    // find the positioned controller based on the data controller's gamepad array index
    let positionedObject = gl.vr.getController(event.target.gamepad.index)
    // gather all hits to tracked scene object3ds
    let hits = getControllerIntersections(positionedObject, list)
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
      log(`select ${match.userData.id.slice(0, 7)}`)

      let cursor = positionedObject.getObjectByName('cursor')
      cursor.position.z = -intersection.distance

      const pos = match.getWorldPosition(new THREE.Vector3())
      const offset = new THREE.Vector3().subVectors(intersection.point, pos)

      controller.userData.selected = match.userData.id
      controller.userData.selectOffset = offset

      dispatch(selectObject(match.userData.id))
    } else {
      // console.log('clearing selection')
      log(`select none`)
      controller.userData.selected = null
      controller.userData.selectOffset = null
      dispatch(selectObject(null))
    }
  }

  const onSelectEnd = event => {
    const controller = event.target
    controller.pressed = false

    if (selections.length && controller.userData.selected) {
      // find the positioned controller based on the data controller's gamepad array index
      let positionedObject = gl.vr.getController(event.target.gamepad.index)

      // find the cursor
      let cursor = positionedObject.getObjectByName('cursor')
      // make sure its position is exact
      positionedObject.updateMatrixWorld()
      // grab its world position
      let wp = new THREE.Vector3()
      cursor.getWorldPosition(wp)
      // offset it
      wp.sub(controller.userData.selectOffset)

      // TODO worldscale
      // TODO rotation
      // TODO soundBeam

      // console.log('updateObject', selections[0], wp.x, wp.y, wp.z)

      dispatch(updateObject(selections[0], {
        x: wp.x,
        y: wp.z,
        z: wp.y,
        // rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z }
      }))
    }

    controller.userData.selected = null
    controller.userData.selectOffset = null
  }

  const onGripDown = event => {
    const controller = event.target
    controller.gripped = true

    let other = oppositeController(controller)
    if (other && other.gripped) {
      console.log('selecting mini mode')
      setTeleportMode(false)
      return
    }

    if (controller.userData.selected) return

    // the target position value will be old until the next gl render
    // so consider it invalid, to hide the mesh, until then
    set(state => ({ ...state, teleportTargetValid: false }))
    setTeleportMode(true)
  }

  const onGripUp = event => {
    const controller = event.target
    controller.gripped = false

    setTeleportMode(false)
  }

  const onAxesChanged = event => {
    let controllerWithSelection = dataControllers.find(controller => controller.userData.selected)

    if (controllerWithSelection) {
      // onMoveObject(event)
      // onRotateObject(event)
    } else {
      onMoveCamera(event)
      onRotateCamera(event)
    }
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

  const onTeleport = () => {
    // TODO adjust by worldScale
    // TODO reset worldScale after teleport

    if (teleportTargetValid) {
      let pos = useStoreApi.getState().teleportTargetPos
      teleport(pos[0], 0, pos[2], null)
      setTeleportMode(false)
    }
  }

  // controller state via THREE.VRController
  const dataControllers = useVrControllers({
    onSelectStart,
    onSelectEnd,
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

    if (teleportMode) {
      for (let i = 0; i < dataControllers.length; i++) {
        // via THREE.VRController
        let dataObject = dataControllers[i]
        // via WebVRManager
        let positionedObject = gl.vr.getController(dataObject.gamepad.index)
        // we need both
        if (!(positionedObject && dataObject)) continue

        if (dataObject.gripped) {
          let hits = getControllerIntersections(positionedObject, [groundRef.current])
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
      }
    }

    if (selectedId) {
      let object3d = scene.__interaction.find(o => o.userData.id === selectedId)

      // TODO handle if object3d no longer exists
      //      e.g.: if scene was changed externally

      for (let i = 0; i < dataControllers.length; i++) {
        // via THREE.VRController
        let dataObject = dataControllers[i]
        // via WebVRManager
        let positionedObject = gl.vr.getController(dataObject.gamepad.index)
        // we need both
        if (!(positionedObject && dataObject)) continue

        if (dataObject.pressed && dataObject.userData.selected) {
          if (object3d) {
            // TODO position/rotate object3d based on controller3d

            // TODO constraints, snap

            // find the cursor
            let cursor = positionedObject.getObjectByName('cursor')
            // make sure its position is exact
            positionedObject.updateMatrixWorld()
            // grab its world position
            let wp = new THREE.Vector3()
            cursor.getWorldPosition(wp)
            // offset it
            wp.sub(dataObject.userData.selectOffset)
            // set the position
            object3d.position.copy(wp)

          }
        }
      }
    }
  }, false, [set, dataControllers])
}

module.exports = {
  useStore,
  useStoreApi,
  useInteractionsManager
}
