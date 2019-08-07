// only show rstats in `development` mode
const SHOW_RSTATS = process.env.NODE_ENV === 'development'

const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useRender } = require('react-three-fiber')

const { connect, useStore, useDispatch, Provider } = require('react-redux')
const React = require('react')
const { useEffect, useRef, useMemo, useState, useReducer } = React
const { ActionCreators } = require('redux-undo')

const {
  createObject,
  updateObject,
  deleteObjects,
  duplicateObjects,
  selectBone,
  updateCharacterSkeleton,

  getSceneObjects,
  getWorld,
  getActiveCamera,
  getSelectedBone,
  initialState
} = require('../../shared/reducers/shot-generator')

// all pose presets (so we can use `stand` for new characters)
const defaultPosePresets = require('../../shared/reducers/shot-generator-presets/poses.json')
// id of the pose preset used for new characters
const DEFAULT_POSE_PRESET_ID = '79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE'

const { WEBVR } = require('../../vendor/three/examples/js/vr/WebVR')

const SGWorld = require('./components/SGWorld')
const SGSpotLight = require('./components/SGSpotLight')
const SGVirtualCamera = require('./components/SGVirtualCamera')
const SGModel = require('./components/SGModel')
const SGController = require('./components/SGController')
const SGCharacter = require('./components/SGCharacter')
const GUI = require('./gui/GUI')

const { controllerObjectSettings, cameraObjectSettings } = require('./utils/xrObjectSettings')
const { getIntersections, boneIntersect, intersectObjects, constraintObjectRotation, setControllerData } = require('./utils/xrControllerFuncs')
const { findParent, moveObject, rotateObject, createHideArray, updateObjectHighlight } = require('./utils/xrHelperFuncs')
const { useAttachmentLoader, getFilepathForLoadable } = require('./hooks/useAttachmentLoader')
const useInterval = require('../../hooks/use-interval')
const applyDeviceQuaternion = require('../../shot-generator/apply-device-quaternion')
require('./lib/VRController')

const RStats = require('./lib/rStats')
require('./lib/rStats.extras')

// preload audio immediately into cache
new THREE.AudioLoader().load('data/snd/vr-select.ogg', () => {})
new THREE.AudioLoader().load('data/snd/vr-welcome.ogg', () => {})
new THREE.AudioLoader().load('data/snd/vr-beam2.mp3', () => {})
  // new THREE.AudioLoader().load('data/snd/vr-atmosphere.mp3', () => {})

// via PosePresetsEditor.js
const comparePresetNames = (a, b) => {
  var nameA = a.name.toUpperCase()
  var nameB = b.name.toUpperCase()

  if (nameA < nameB) {
    return -1
  }
  if (nameA > nameB) {
    return 1
  }
  return 0
}
const comparePresetPriority = (a, b) => b.priority - a.priority

const useVrControllers = ({ onSelectStart, onSelectEnd, onGripDown, onGripUp, onAxisChanged, undo, redo }) => {
  const [controllers, setControllers] = useState([])

  const onSelectStartRef = useRef()
  const onSelectEndRef = useRef()
  const onGripDownRef = useRef()
  const onGripUpRef = useRef()
  const onAxisChangedRef = useRef()
  onSelectStartRef.current = onSelectStart
  onSelectEndRef.current = onSelectEnd
  onGripDownRef.current = onGripDown
  onGripUpRef.current = onGripUp
  onAxisChangedRef.current = onAxisChanged

  const { gl } = useThree()

  const onVRControllerConnected = event => {
    let id = THREE.Math.generateUUID()

    let controller = event.detail
    controller.standingMatrix = gl.vr.getStandingMatrix()

    // TODO
    // controller.head = window.camera

    controller.addEventListener('trigger press began', (...rest) => onSelectStartRef.current(...rest))
    controller.addEventListener('trigger press ended', (...rest) => onSelectEndRef.current(...rest))
    controller.addEventListener('grip press began', (...rest) => onGripDownRef.current(...rest))
    controller.addEventListener('grip press ended', (...rest) => onGripUpRef.current(...rest))
    controller.addEventListener('thumbstick axes changed', (...rest) => onAxisChangedRef.current(...rest))
    controller.addEventListener('thumbpad axes changed', (...rest) => onAxisChangedRef.current(...rest))
    controller.addEventListener('disconnected', event => {
      setControllers(state => state.filter(object3d => object3d.uuid === event.target.uuid))
    })
    controller.addEventListener('A press ended', event => undo())
    controller.addEventListener('B press ended', event => redo())

    setControllerData(controller)
    setControllers(state => [ ...state, controller ])
  }

  useEffect(() => {
    console.log('ADD onVRControllerConnected')
    window.addEventListener('vr controller connected', onVRControllerConnected)
    return () => {
      console.log('REMOVE onVRControllerConnected')
      window.removeEventListener('vr controller connected', onVRControllerConnected)
    }
  }, [])

  return controllers
}

// TODO mapStateToProps
const SceneContent = connect()(
({
  aspectRatio,
  models,
  presets,
  sceneObjects,
  getModelData,
  activeCamera,
  world,
  createObject,
  updateObject,
  deleteObjects,
  duplicateObjects,
  selectedBone,
  selectBone,
  updateCharacterSkeleton,
  undo,
  redo
}) => {
  const dispatch = useDispatch()

  const teleportMaxDist = 10
  const rStatsRef = useRef(null)
  // const hmdCameraGroup = useRef(null)

  const [guiMode, setGuiMode] = useState('selection')
  const [addMode, setAddMode] = useState(null)
  const [virtualCamVisible, setVirtualCamVisible] = useState(true)
  const [flipHand, setFlipHand] = useState(false)
  const [guiSelector, setGuiSelector] = useState(false)
  const [helpToggle, setHelpToggle] = useState(false)
  const [helpSlide, setHelpSlide] = useState(0)
  const [currentBoard, setCurrentBoard] = useState(null)
  const [camExtraRot, setCamExtraRot] = useState(0)
  const [teleportPos, setTeleportPos] = useState(null)
  const [teleportRot, setTeleportRot] = useState(0)

  const [selectedObject, setSelectedObject] = useState(null)
  const [guiCamFOV, setGuiCamFOV] = useState(22)
  const [hideArray, setHideArray] = useState([])
  const [worldScale, setWorldScale] = useState(1)
  const [selectorOffset, setSelectorOffset] = useState(0)
  const [teleportMode, setTeleportMode] = useState(false)
  const [standingMemento, setStandingMemento] = useState(null)

  const hmdCameraGroup = useRef()
  const hmdCamera = useRef()

  const MINIATURE_MODE_SCALE = 0.1
  const worldScaleGroupRef = useRef(null)
  const teleportLocRef = useRef(null)
  const moveCamRef = useRef(null)
  const rotateCamRef = useRef(null)
  const intersectArray = useRef([])
  const guiArray = useRef([])
  const teleportArray = useRef([])
  const previousTime = useRef([null])

  // Why do I need to create ref to access updated state in some functions?
  const guiModeRef = useRef(null)
  const selectedObjRef = useRef(null)

  // Rotate Bone
  let isControllerRotatingCurrent = useRef(false)
  let startingObjectQuaternion = useRef(null)
  let startingDeviceOffset = useRef(null)
  let startingObjectOffset = useRef(null)
  let startingDeviceRotation = useRef(null)

  guiModeRef.current = guiMode

  const { gl, scene, camera } = useThree()

  useMemo(() => {
    scene.background = new THREE.Color(world.backgroundColor)
  }, [world.backgroundColor])

  const onUpdateGUIProp = e => {
    const { id, prop, value } = e.detail

    if (prop === 'guiFOV') {
      const guiCam = scene.getObjectByName('guiCam')
      setGuiCamFOV(guiCam.fov)
      return
    }

    if (prop === 'fov') {
      const camGroup = worldScaleGroupRef.current.children.find(child => child.userData.id === id)
      const cam = camGroup.userData.camera
      if (cam) updateObject(id, { [prop]: cam.fov })
      return
    }

    switch (prop) {
      case 'size':
        updateObject(id, {
          width: value,
          height: value,
          depth: value
        })
        break
      case 'mesomorphic':
      case 'ectomorphic':
      case 'endomorphic':
        updateObject(id, {
          morphTargets: { [prop]: value }
        })
        break
      default:
        updateObject(id, { [prop]: value })
        break
    }
  }

  useEffect(() => {
    window.addEventListener('updateGUIProp', onUpdateGUIProp)
    return () => {
      window.removeEventListener('updateGUIProp', onUpdateGUIProp)
    }
  }, [])

  const onTeleport = event => {
    var controller = event.target
    const intersect = intersectObjects(controller, teleportArray.current)

    if (intersect && intersect.distance < teleportMaxDist) {
      // console.log('try to teleport')
      vrControllers.forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      let point = intersect.point.multiplyScalar(1 / worldScale)
      point.y = 0
      setTeleportPos(point)
      setWorldScale(1)
    }
  }

  const rotateBone = controller => {
    const target = controller.userData.bone

    if (!isControllerRotatingCurrent.current) {
      isControllerRotatingCurrent.current = true
      let startValues = new THREE.Matrix4().extractRotation(controller.matrixWorld)
      startingDeviceRotation.current = new THREE.Quaternion().setFromRotationMatrix(startValues)

      startingDeviceOffset.current = new THREE.Quaternion()
        .clone()
        .inverse()
        .multiply(startingDeviceRotation.current)
        .normalize()
        .inverse()
      startingObjectQuaternion.current = target.quaternion.clone()
      startingObjectOffset.current = new THREE.Quaternion()
        .clone()
        .inverse()
        .multiply(startingObjectQuaternion.current)
    }

    let middleValues = new THREE.Matrix4().extractRotation(controller.matrixWorld)
    let deviceQuaternion = new THREE.Quaternion().setFromRotationMatrix(middleValues)

    let objectQuaternion = applyDeviceQuaternion({
      parent: target.parent,
      startingDeviceOffset: startingDeviceOffset.current,
      startingObjectOffset: startingObjectOffset.current,
      startingObjectQuaternion: startingObjectQuaternion.current,
      deviceQuaternion,
      camera,
      useCameraOffset: true
    })

    target.quaternion.copy(objectQuaternion.normalize())
  }

  const onSelectStart = event => {
    const controller = event.target
    controller.pressed = true

    if (teleportMode) {
      onTeleport(event)
      return
    }

    const otherController = vrControllers.find(i => i.uuid !== controller.uuid)
    if (otherController && otherController.userData.selected) return
    if (controller.gripped) return

    const intersections = getIntersections(controller, intersectArray.current)

    if (intersections.length > 0) {
      let didMakeSelection = onIntersection(controller, intersections)
      if (didMakeSelection) {
        soundSelect.current.play()
      }
    } else {
      setSelectedObject(0)
      selectedObjRef.current = null
      setHideArray(createHideArray(scene))
    }
  }

  // returns true if selection was successful
  const onIntersection = (controller, intersections) => {
      let intersection = intersections[0]
      if (intersection.object.userData.type === 'bone') return true

      if (intersection.object.userData.type === 'slider') {
        controller.intersections = intersections
        return true
      }

      if (intersection.object.name.includes('selector-pose')) {
        const posePresetId = intersection.object.name.split('_')[1]
        const skeleton = presets.poses[posePresetId].state.skeleton
        const object = worldScaleGroupRef.current.children.find(child => child.userData.id === selectedObject)
        updateObject(object.userData.id, { posePresetId, skeleton })
      }

      if (intersection.object.name.includes('selector-object')) {
        const model = intersection.object.name.split('_')[1]
        const object = worldScaleGroupRef.current.children.find(child => child.userData.id === selectedObject)
        updateObject(object.userData.id, { model, depth: 1, height: 1, width: 1 })

        // hacky way of refreshing slider values
        setSelectedObject(0)
        setSelectedObject(object.userData.id)
      }

      if (intersection.object.name.includes('selector-character')) {
        const model = intersection.object.name.split('_')[1]
        const object = worldScaleGroupRef.current.children.find(child => child.userData.id === selectedObject)
        updateObject(object.userData.id, { model, height: initialState.models[model].height })

        // hacky way of refreshing slider values
        setSelectedObject(0)
        setSelectedObject(object.userData.id)
      }

      if (intersection.object.userData.type === 'gui') {
        const { name } = intersection.object
        if (name.includes('mode')) {
          const mode = name.split('_')[0]
          onChangeGuiMode(mode)
        }

        if (name.includes('_add')) {
          const mode = name.split('_')[0]
          onAddObject(mode)
          setTimeout(() => {
            setAddMode(null)
          }, 250)
        }

        if (name.includes('board')) {
          const board = name.split('_')[0]
          setCurrentBoard(board)
          setTimeout(() => {
            setCurrentBoard(null)
          }, 250)
        }

        if (name.includes('button')) {
          const button = name.split('_')[0]
          if (button === 'eye') {
            setVirtualCamVisible(oldValue => {
              return !oldValue
            })
          } else if (button === 'hand') {
            setFlipHand(oldValue => {
              return !oldValue
            })
          } else if (button === 'selector') {
            const type = name.split('_')[1]
            setSelectorOffset(0)
            setGuiSelector(oldValue => {
              const newValue = oldValue === type ? false : type
              return newValue
            })
          } else if (button === 'help') {
            setHelpToggle(oldValue => {
              return !oldValue
            })
          } else if (button === 'camera') {
            setAddMode('gui_camera')

            const guiCam = scene.getObjectByName('guiCam')
            const pos = guiCam.getWorldPosition(new THREE.Vector3())
            const rot = guiCam.getWorldQuaternion(new THREE.Quaternion())
            const euler = new THREE.Euler().setFromQuaternion(rot, 'YXZ')

            const id = THREE.Math.generateUUID()
            createObject({
              id,
              type: 'camera',
              fov: guiCam.fov,
              x: pos.x,
              y: pos.z,
              z: pos.y,
              rotation: euler.y,
              roll: euler.z,
              tilt: euler.x
            })

            setTimeout(() => {
              setAddMode(null)
            }, 250)
          }

        }

        if (name.includes('helpButton')) {
          const slideCount = 8
          const button = name.split('_')[0]
          if (button === 'close') {
            setHelpToggle(false)
          } else if (button === 'prev') {
            setAddMode('help_prev')
            setHelpSlide(oldValue => {
              const value = oldValue - 1
              return value < 0 ? (slideCount-1) : value
            })
            setTimeout(() => {
              setAddMode(null)
            }, 250)
          } else if (button === 'next') {
            setAddMode('help_next')
            setHelpSlide(oldValue => {
              return (oldValue + 1) % slideCount
            })
          }
        }

        return true
      }

      if (intersection.object.userData.type === 'hitter' && intersection.object.parent.userData.character) {
        intersection.object = intersection.object.parent.userData.character
      }

      let object = findParent(intersection.object)
      const { id } = object.userData
      // is this probably NOT a scene object?
      // (used to exclude environment meshes for example)
      if (object.userData.id == null) {
        return false
      }

      setSelectedObject(id)
      selectedObjRef.current = object
      setHideArray(createHideArray(scene))
      setGuiMode('selection')

      if (object.userData.type === 'character') {
        if (object.userData.name === 'character-container') object = object.children[0]

        const raycastDepth = controller.getObjectByName('raycast-depth')
        raycastDepth.position.z = -intersection.distance

        const objectWorldPos = intersection.object.getWorldPosition(new THREE.Vector3())
        const posOffset = new THREE.Vector3().subVectors(intersection.point, objectWorldPos)
        controller.userData.posOffset = posOffset

        const quaternion = new THREE.Quaternion()
        controller.matrixWorld.decompose(new THREE.Vector3(), quaternion, new THREE.Vector3())
        const newMatrix = new THREE.Matrix4().compose(
          new THREE.Vector3(),
          quaternion,
          new THREE.Vector3(1, 1, 1)
        )

        const rotVector = new THREE.Vector3(1, 0, 0).applyMatrix4(newMatrix)
        const rotOffset = Math.atan2(rotVector.y, rotVector.x)
        controller.userData.rotOffset = rotOffset
        setHideArray(createHideArray(scene))
      } else {
        const tempMatrix = new THREE.Matrix4()
        tempMatrix
          .getInverse(controller.matrixWorld)
          .multiply(new THREE.Matrix4().makeScale(worldScale, worldScale, worldScale))

        object.matrix.premultiply(tempMatrix)
        object.matrix.decompose(object.position, object.quaternion, new THREE.Vector3())
        object.scale.multiplyScalar(worldScale)

        controller.add(object)
      }

      controller.userData.selected = object
      soundBeam.current.play()
      // updateObjectHighlight(intersection.object, 0.15)

      return true
  }

  const onChangeGuiMode = mode => {
    switch (mode) {
      case 'add':
        setGuiMode(mode)
        setSelectedObject(0)
        selectedObjRef.current = null
        setHideArray(createHideArray(scene))
        break
      case 'selection':
        setGuiMode(mode)
        break
      case 'erase':
        if (!selectedObjRef.current) return
        if (selectedObjRef.current.userData.id === activeCamera) return
        setGuiMode(mode)

        deleteObjects([selectedObjRef.current.userData.id])
        setSelectedObject(0)
        selectedObjRef.current = null
        setHideArray(createHideArray(scene))

        setTimeout(() => {
          setGuiMode('selection')
        }, 250)
        break
      case 'duplicate':
        if (!selectedObjRef.current) return
        setGuiMode(mode)

        const id = THREE.Math.generateUUID()
        duplicateObjects([selectedObjRef.current.userData.id], [id])

        setTimeout(() => {
          const match = worldScaleGroupRef.current.children.find(child => child.userData.id === id)
          setSelectedObject(match.userData.id)
          selectedObjRef.current = match
          setHideArray(createHideArray(scene))
          setGuiMode('selection')
        }, 250)
        break
    }
  }

  const onAddObject = mode => {
    const id = THREE.Math.generateUUID()

    const hmdCam = hmdCamera.current
    let offsetVector
    if (mode == 'camera') {
      offsetVector = new THREE.Vector3(0, 0, -1)
    } else {
      offsetVector = new THREE.Vector3(0, 0, -2)
    }
    offsetVector.applyMatrix4(new THREE.Matrix4().extractRotation(hmdCam.matrixWorld))
    offsetVector.multiply(new THREE.Vector3(1, 0, 1)).multiplyScalar(worldScale === 1 ? 1 : 0.5 / worldScale)
    const newPoz = hmdCameraGroup.current.position
      .clone()
      .multiply(new THREE.Vector3(1 / worldScale, 0, 1 / worldScale))
      .add(hmdCam.position)
      .add(offsetVector)

    const rotation = new THREE.Vector2(offsetVector.x, offsetVector.z).normalize().angle() * -1 - Math.PI / 2

    switch (mode) {
      case 'camera':
        setAddMode('camera')

        createObject({
          id,

          type: 'camera',
          fov: 22.25,
          x: newPoz.x,
          y: newPoz.z,
          z: newPoz.y,
          rotation: rotation,
          tilt: 0,
          roll: 0
        })
        break
      case 'object':
        setAddMode('object')

        createObject({
          id,
          type: 'object',
          model: 'box',
          width: 1,
          height: 1,
          depth: 1,
          x: newPoz.x,
          y: newPoz.z,
          z: 0,
          rotation: { x: 0, y: rotation, z: 0 }, //Math.random() * Math.PI * 2,

          visible: true
        })
        break
      case 'character':
        setAddMode('character')

        createObject({
          id,
          type: 'character',
          height: 1.8,
          model: 'adult-male',
          x: newPoz.x,
          y: newPoz.z,
          z: 0,
          rotation: rotation, //newPoz.rotation,
          headScale: 1,

          morphTargets: {
            mesomorphic: 0,
            ectomorphic: 0,
            endomorphic: 0
          },

          posePresetId: DEFAULT_POSE_PRESET_ID,
          skeleton: defaultPosePresets[DEFAULT_POSE_PRESET_ID].state.skeleton,

          visible: true
        })
        break
      case 'light':
        setAddMode('light')

        createObject({
          id,
          type: 'light',
          x: newPoz.x,
          y: newPoz.z,
          z: newPoz.y,
          rotation: 0,
          tilt: 0,
          intensity: 0.8,
          visible: true,
          angle: 1.04,
          distance: 5,
          penumbra: 1.0,
          decay: 1
        })
        break
    }
  }

  const onSelectEnd = event => {
    const controller = event.target
    controller.pressed = false

    if (controller.userData.selected !== undefined) {
      const object = controller.userData.selected

      if (object.userData.type !== 'character' && object.parent.uuid === controller.uuid) {
        object.matrix.premultiply(controller.matrixWorld)
        object.matrix.decompose(object.position, object.quaternion, new THREE.Vector3())
        object.scale.set(1, 1, 1)
        worldScaleGroupRef.current.add(object)
        object.position.multiplyScalar(1 / worldScale)
      }

      controller.userData.selected = undefined
      soundBeam.current.stop()

      // is this probably a scene object?
      // (used to exclude environment meshes for example)
      if (object.userData.id) {
        updateObjectForType(object)
      }
    }
  }

  const updateObjectForType = object => {
    if (object.userData.type === 'character') {
      updateObject(object.userData.id, {
        x: object.position.x,
        y: object.position.z,
        z: object.position.y,
        rotation: object.rotation.y
      })
    } else if (object.userData.type === 'light' || object.userData.type === 'virtual-camera') {
      const euler = new THREE.Euler().setFromQuaternion(object.quaternion, 'YXZ')

      updateObject(object.userData.id, {
        x: object.position.x,
        y: object.position.z,
        z: object.position.y,
        rotation: euler.y,
        roll: euler.z,
        tilt: euler.x
      })
    } else {
      updateObject(object.userData.id, {
        x: object.position.x,
        y: object.position.z,
        z: object.position.y,
        rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z }
      })
    }
  }

  const onAxisChanged = event => {
    let selected = false
    let selectorHover = event.target.intersections.length && event.target.intersections[0].object.name.includes('selector') ? true : false

    if (selectorHover) {
      if (Math.abs(event.axes[1]) < 0.125) return
      if (!previousTime.current) previousTime.current = 0

      const currentTime = Date.now()
      const delta = currentTime - previousTime.current

      const timeThreshold = 4 - parseInt(Math.abs(event.axes[1]) / 0.25)

      if (delta > timeThreshold * 125) {
        previousTime.current = currentTime
        setSelectorOffset(oldValue => {
          let newValue = oldValue + Math.sign(event.axes[1])
          newValue = Math.max(newValue, 0)

          const count = (() => {
            switch (guiSelector) {
              case 'pose':
                return Object.keys(presets.poses).length
              case 'object':
                return Object.values(models).filter(model => model.type === 'object').length
              case 'character':
                return Object.values(models).filter(model => model.type === 'character').length
            }
          })()

          const limit = Math.max(Math.ceil(count / 4) - 3, 0)
          newValue = Math.min(newValue, limit)
          return newValue
        })
      }

      return
    }

    vrControllers.forEach(controller => {
      if (!selected) selected = controller.userData.selected ? controller : false
    })

    if (selected) {
      moveObject(event, selected, worldScale)
      rotateObject(event, selected)
    } else {
      moveCamera(event)
      rotateCamera(event)
    }
  }

  const moveCamera = event => {
    if (event.axes[1] === 0) {
      moveCamRef.current = null
    }

    if (moveCamRef.current) return
    if (Math.abs(event.axes[1]) < Math.abs(event.axes[0])) return

    const { x, y } = hmdCameraGroup.current.userData
    const hmdCam = hmdCamera.current
    const worldScaleMult = worldScale === 1 ? 1 : worldScale * 2

    if (event.axes[1] > 0.075) {
      vrControllers.forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      moveCamRef.current = 'Backwards'

      let offsetVector = new THREE.Vector3(0, 0, 1)
      offsetVector.applyMatrix4(new THREE.Matrix4().extractRotation(hmdCam.matrixWorld))
      offsetVector = offsetVector.multiply(new THREE.Vector3(1, 0, 1)).normalize().multiplyScalar(worldScaleMult)

      setTeleportPos(oldPos => {
        if (!oldPos) {
          offsetVector.add(new THREE.Vector3(x, 0, y))
          return offsetVector
        } else {
          return oldPos.clone().add(offsetVector)
        }
      })
    }

    if (event.axes[1] < -0.075) {
      vrControllers.forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      moveCamRef.current = 'Forwards'

      let offsetVector = new THREE.Vector3(0, 0, -1)
      offsetVector.applyMatrix4(new THREE.Matrix4().extractRotation(hmdCam.matrixWorld))
      offsetVector = offsetVector.multiply(new THREE.Vector3(1, 0, 1)).normalize().multiplyScalar(worldScaleMult)

      setTeleportPos(oldPos => {
        if (!oldPos) {
          offsetVector.add(new THREE.Vector3(x, 0, y))
          return offsetVector
        } else {
          return oldPos.clone().add(offsetVector)
        }
      })
    }
  }

  const rotateCamera = event => {
    if (event.axes[0] === 0) {
      rotateCamRef.current = null
    }

    if (rotateCamRef.current) return
    if (Math.abs(event.axes[0]) < Math.abs(event.axes[1])) return

    if (event.axes[0] > 0.075) {
      vrControllers.forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      rotateCamRef.current = 'Right'

      /*
      // update teleport pos
      let hmdWorldPos = hmdCamera.current.localToWorld(hmdCamera.current.position.clone())

      console.log('rotate right', {
        hmd: hmdCamera.current.position,
        group: hmdCameraGroup.current.position,
        teleport: teleportPos,
        hmdWorldPos
      })

      setTeleportPos(
        new THREE.Vector3(
          hmdWorldPos.x,
          teleportPos.y,
          hmdWorldPos.z
        )
      )
      // then rotate
      */
      setCamExtraRot(prev => prev - 1)
    }

    if (event.axes[0] < -0.075) {
      vrControllers.forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      rotateCamRef.current = 'Left'

      /*
      // update teleport pos
      let hmdWorldPos = hmdCamera.current.localToWorld(hmdCamera.current.position.clone())

      console.log('rotate left from:', {
        hmd: hmdCamera.current.position,
        group: hmdCameraGroup.current.position,
        teleport: teleportPos,
        hmdWorldPos
      })

      setTeleportPos(
        new THREE.Vector3(
          hmdWorldPos.x,
          teleportPos.y,
          hmdWorldPos.z
        )
      )
      // then rotate
      */
      setCamExtraRot(prev => prev + 1)
    }
  }

  const onGripDown = event => {
    setTeleportMode(true)

    const controller = event.target
    controller.gripped = true

    const otherController = vrControllers.find(i => i.uuid !== controller.uuid)
    if (!selectedObjRef.current && otherController && otherController.gripped) {
      setTeleportMode(false)

      if (worldScale === 1) {
        // remember where we were standing
        setStandingMemento({
          teleportPos: teleportPos,
          camExtraRot: camExtraRot
        })

        // switch to mini mode
        setWorldScale(MINIATURE_MODE_SCALE)

        // alter the camera position
        setTeleportPos(new THREE.Vector3(
          (hmdCameraGroup.current.position.x*MINIATURE_MODE_SCALE),
          -(hmdCamera.current.position.y - 0.75),
          (hmdCameraGroup.current.position.z*MINIATURE_MODE_SCALE),
        ))

        let offsetVector = new THREE.Vector3(0, 0, 1)
        offsetVector.applyMatrix4(new THREE.Matrix4().extractRotation(hmdCamera.current.matrixWorld))
        offsetVector = offsetVector.multiply(new THREE.Vector3(1, 0, 1)).normalize().multiplyScalar(1)

        setTeleportPos(oldPos => {
          if (!oldPos) {
            offsetVector.add(new THREE.Vector3(x, 0, y))
            return offsetVector
          } else {
            return oldPos.clone().add(offsetVector)
          }
        })



        //setCamExtraRot(0)
      } else {
        // set the world scale
        setWorldScale(1)

        // return to where we were standing
        setTeleportPos(standingMemento.teleportPos)
        setCamExtraRot(standingMemento.camExtraRot)

        // clear the memento
        setStandingMemento(null)
      }

      return
    }

    if (selectedObjRef.current && selectedObjRef.current.userData.type === 'character' && !selectedBone) {
      const bonesHelper = selectedObjRef.current.children[0].bonesHelper
      const hits = boneIntersect(controller, bonesHelper)
      if (hits.length) {
        controller.userData.bone = hits[0].bone
        selectBone(hits[0].bone.uuid)
        return
      }
    }

    for (let i = 0; i < vrControllers.length; ++i) {
      const controller = vrControllers[i]
      if (controller.pressed && selectedObjRef.current) return
    }

    const intersections = getIntersections(controller, intersectArray.current)

    if (intersections.length > 0) {
      let intersection = intersections[0]
      if (intersection.object.userData.type === 'slider') return
      if (intersection.object.userData.type === 'gui') return
      if (intersection.object.userData.type === 'bone') return

      let object = findParent(intersection.object)
      const { id } = object.userData
      setSelectedObject(id)
      selectedObjRef.current = object
      setHideArray(createHideArray(scene))
      setGuiMode('selection')
    } else {
      setSelectedObject(0)
      selectedObjRef.current = null
      setHideArray(createHideArray(scene))
    }
  }

  const onGripUp = event => {
    setTeleportMode(false)

    const controller = event.target
    controller.gripped = false

    if (controller.userData.bone) {
      const target = controller.userData.bone
      const parent = findParent(target)
      let rotation = new THREE.Euler()
      rotation.setFromQuaternion(target.quaternion.clone().normalize(), 'XYZ')

      updateCharacterSkeleton({
        id: parent.userData.id,
        name: target.name,
        rotation: {
          x: rotation.x,
          y: rotation.y,
          z: rotation.z
        }
      })

      controller.userData.bone = undefined
      isControllerRotatingCurrent.current = false
      selectBone(null)
    }

    if (controller.userData.selected) {
      const object = controller.userData.selected
      if (object.userData.type !== 'object') return

      const tempMatrix = new THREE.Matrix4()
      tempMatrix.getInverse(controller.matrixWorld).multiply(new THREE.Matrix4().makeScale(worldScale, worldScale, worldScale))

      object.matrix.premultiply(tempMatrix)
      object.matrix.decompose(object.position, object.quaternion, object.scale)
      controller.add(object)
    }
  }

  const vrControllers = useVrControllers({
    onSelectStart, onSelectEnd, onGripDown, onGripUp, onAxisChanged, undo, redo
  })

  useEffect(() => {
    intersectArray.current = worldScaleGroupRef.current.children.filter(
      child =>
        (child instanceof THREE.Mesh || child instanceof THREE.Group) &&
        (child.userData.type !== 'ground' && child.userData.type !== 'room' && child.userData.type !== 'camera')
    )

    guiArray.current = []
    vrControllers.forEach(controller => {
      const gui = controller.children.filter(child => child.userData.type === 'gui')[0]

      if (gui) {
        gui.traverse(child => {
          if (child.name === 'properties_container' || child.name === 'fov_slider') {
            intersectArray.current.push(gui)
            guiArray.current.push(gui)
          }
        })
      }
    })

    teleportArray.current = scene.children.filter(child => child.userData.type === 'raycastGround')
    setHideArray(createHideArray(scene))
  }, [vrControllers, sceneObjects, flipHand])

  useRender(() => {
    if (rStatsRef.current) {
      rStatsRef.current('rAF').tick()
      rStatsRef.current('FPS').frame()
      rStatsRef.current().update()
    }

    THREE.VRController.update()

    for (let i = 0; i < vrControllers.length; i++) {
    const controller = vrControllers[i]
      if (
        selectedObjRef.current &&
        selectedObjRef.current.userData.type === 'character' &&
        !selectedBone &&
        // has it loaded the skinned mesh yet?
        selectedObjRef.current.children[0]
      ) {
        const bonesHelper = selectedObjRef.current.children[0].bonesHelper
        const hits = bonesHelper ? boneIntersect(controller, bonesHelper) : []
        if (hits.length) {
          if (controller.userData.currentBoneHighlight === hits[0].bone) return
          controller.userData.currentBoneHighlight = hits[0].bone
          controller.userData.currentBoneHighlight.connectedBone.material.color = new THREE.Color(0x242246)
        } else if (controller.userData.currentBoneHighlight) {
          controller.userData.currentBoneHighlight.connectedBone.material.color = new THREE.Color(0x7a72e9)
          controller.userData.currentBoneHighlight = null
        }
      }

      const handedness = controller.getHandedness()
      const otherController = vrControllers[1 - i]
      if (handedness === (flipHand ? 'right' : 'left')) {
        if (otherController && !otherController.pressed && !controller.userData.selected) {
          const intersections = getIntersections(controller, guiArray.current)
          if (intersections.length > 0) {
            let intersection = intersections[0]
            if (intersection.object.userData.type === 'slider') controller.intersections = intersections
            else if (intersection.object.name.includes('selector')) controller.intersections = [intersection]
          }
        }
        else if (controller.intersections.lenght !== 0) controller.intersections = []
      }

      const object = controller.userData.selected
      if (object && object.userData.type === 'character') {
        constraintObjectRotation(controller, worldScale)
      }

      if (controller.pressed === true) {
        if (object && object.userData.type === 'object' && controller.gripped) {
          if (object.parent.uuid === controller.uuid) snapObjectRotation(object, controller)
          else constraintObjectRotation(controller, worldScale)
        }
      }

      if (controller.gripped) {
        if (!teleportLocRef.current) return
        const intersect = intersectObjects(controller, teleportArray.current)
        if (intersect && intersect.distance < teleportMaxDist) {
          teleportLocRef.current.position.copy(intersect.point)
          teleportLocRef.current.material.visible = true
        } else {
          teleportLocRef.current.material.visible = false
        }
      }

      if (controller.userData.bone) rotateBone(controller)
    }
  }, false, [vrControllers, selectedBone, worldScale, flipHand])

  const snapObjectRotation = (object, controller) => {
    object.matrix.premultiply(controller.matrixWorld)
    object.matrix.decompose(object.position, object.quaternion, new THREE.Vector3())
    object.scale.set(object.scale.x / worldScale, object.scale.y / worldScale, object.scale.z / worldScale)
    object.position.multiplyScalar(1 / worldScale)

    object.userData.order = object.rotation.order
    object.rotation.reorder('YXZ')

    const sign = Math.sign(object.rotation.y)
    let degreeY = THREE.Math.radToDeg(Math.abs(object.rotation.y)) / 22.5
    degreeY = THREE.Math.degToRad(Math.round(degreeY) * 22.5) * sign

    let degreeZ = THREE.Math.radToDeg(Math.abs(object.rotation.z)) / 180
    degreeZ = THREE.Math.degToRad(Math.round(degreeZ) * 180)

    object.rotation.x = 0
    object.rotation.z = degreeZ
    object.rotation.y = degreeY
    object.rotation.order = object.userData.order
    worldScaleGroupRef.current.add(object)

    const intersections = getIntersections(controller, intersectArray.current)
    if (intersections.length > 0) {
      const intersection = intersections[0]
      const raycastDepth = controller.getObjectByName('raycast-depth')
      raycastDepth.position.z = -intersection.distance

      const objectWorldPos = intersection.object.getWorldPosition(new THREE.Vector3())
      const posOffset = new THREE.Vector3().subVectors(intersection.point, objectWorldPos)
      controller.userData.posOffset = posOffset
    }
  }

  useEffect(() => {
    if (SHOW_RSTATS) {
      const threeStats = new window.threeStats(gl)
      rStatsRef.current = new RStats({
        css: [],
        values: {
          fps: { caption: 'fps', below: 30 }
        },
        groups: [{ caption: 'Framerate', values: ['fps', 'raf'] }],
        plugins: [threeStats]
      })
    }
  }, [])

  const soundBeam = useRef()
  const soundSelect = useRef()
  const audioListener = useMemo(() => {
    const listener = new THREE.AudioListener()

    new THREE.AudioLoader().load( 'data/snd/vr-beam2.mp3', buffer => {
      soundBeam.current = new THREE.PositionalAudio( listener )
      soundBeam.current.setBuffer( buffer )
      soundBeam.current.setLoop( true )
      soundBeam.current.setVolume( 1 )
    })

    new THREE.AudioLoader().load(
      'data/snd/vr-select.ogg',
      buffer => {
        soundSelect.current = new THREE.Audio( audioListener )
        soundSelect.current.setBuffer( buffer )
        soundSelect.current.setLoop( false )
        soundSelect.current.setVolume( 0.5 )
      }
    )

    // let atmosphere
    let welcome
    window.addEventListener( 'vrdisplaypresentchange', event => {
      if (event.display.isPresenting) {
        // new THREE.AudioLoader().load(
        //   'data/snd/vr-atmosphere.mp3',
        //   buffer => {
        //     atmosphere = new THREE.PositionalAudio( listener )
        //     atmosphere.setBuffer( buffer )
        //     atmosphere.setLoop( false )
        //     atmosphere.setVolume( 1 )
        //     atmosphere.play()
        //     atmosphere.position.set(0, 5, 0)
        //     scene.add(atmosphere)
        //   }
        // )

        new THREE.AudioLoader().load(
          'data/snd/vr-welcome.ogg',
          buffer => {
            welcome = new THREE.Audio( listener )
            welcome.setBuffer( buffer )
            welcome.setLoop( false )
            welcome.setVolume( 0.35 )
            welcome.play()
          }
        )
      } else {
        // TODO fade out
        // if (atmosphere) {
        //   atmosphere.stop()
        //   scene.remove(atmosphere)
        //   atmosphere = null
        // }
        if (welcome) {
          welcome.stop()
          welcome = null
        }
      }
    }, false )

    return listener
  }, [])

  const poses = useMemo(() => {
    return Object.values(presets.poses)
      .sort(comparePresetNames)
      .sort(comparePresetPriority)
  }, [presets.poses])

  const characterModels = useMemo(() => {
    return Object.values(models).filter(model => model.type === 'character')
  }, [models])

  const objectModels = useMemo(() => {
    return Object.values(models).filter(model => model.type === 'object')
  }, [models])

  const poseTextures = useMemo(() => {
    const textureArray = []
    poses.forEach((pose, id) => {
      const texture = new THREE.TextureLoader().load(`/data/presets/poses/${pose.id}.jpg`)
      textureArray[id] = texture
    })

    return textureArray
  }, [])

  const objectTextures = useMemo(() => {
    const textureArray = []
    objectModels.forEach((model, id) => {
      const texture = new THREE.TextureLoader().load(`/data/system/objects/${model.id}.jpg`)
      textureArray[id] = texture
    })

    return textureArray
  }, [])

  const characterTextures = useMemo(() => {
    const textureArray = []
    characterModels.forEach((model, id) => {
      const texture = new THREE.TextureLoader().load(`/data/system/dummies/gltf/${model.id}.jpg`)
      textureArray[id] = texture
    })

    return textureArray
  }, [])

  // initialize behind the camera, on the floor
  useMemo(() => {
    let { x, y, rotation } = sceneObjects[activeCamera]

    let behindCam = {
      x: Math.sin(rotation),
      y: Math.cos(rotation)
    }

    setTeleportPos(
      new THREE.Vector3(
        x + behindCam.x,
        0,
        y + behindCam.y
      )
    )
    setTeleportRot(rotation)
  }, [])

  const positionDataFor = object3d => {
    let { x, y, z } = object3d.position
    return {
      position: { x, y, z },
    }
  }
  const rotationDataFor = object3d => {
    let { x, y, z } = object3d.rotation
    return {
      rotation: { x, y, z }
    }
  }

  useEffect(() => {
    dispatch({
      type: 'UPDATE_LOCAL',
      payload: {
        id: 'teleport',
        type: 'cursor',
        label: 'teleport',
        ...positionDataFor(hmdCameraGroup.current),
        ...rotationDataFor(hmdCameraGroup.current)
        // position: { x: teleportPos.x, y: teleportPos.y, z: teleportPos.z },
        // rotation: { x: 0, y: teleportRot + (Math.PI / 4 * camExtraRot), z: 0}
      }
    })
    dispatch({
      type: 'UPDATE_LOCAL',
      payload: {
        id: 'display',
        type: 'cursor',
        label: 'display',
        ...positionDataFor(hmdCamera.current),
        ...rotationDataFor(hmdCamera.current)
      }
    })
  }, [teleportPos, teleportRot, camExtraRot])

  useInterval(
    () => {
      dispatch({
        type: 'UPDATE_LOCAL',
        payload: {
          id: 'display',
          type: 'cursor',
          label: 'display',
          ...positionDataFor(hmdCamera.current),
          ...rotationDataFor(hmdCamera.current)
        }
      })
    },
    1000
  )

  let activeCameraComponent = (
    // "body"/container/platform for the HMD, with position offset
    <group
      ref={hmdCameraGroup}
      position={teleportPos}
      rotation={[0, teleportRot + (Math.PI / 4 * camExtraRot), 0]}
    >
      // "head"/P.O.V. moved automatically by HMD motion
      <primitive ref={hmdCamera} object={camera}>
        // listener is attached to the "head"
        <primitive object={audioListener} />
      </primitive>

      // controllers are attached to the "body"
      {vrControllers.map((object, n) => {
        const handedness = object.getHandedness()
        const flipModel = handedness === 'right'
        const hand = flipHand ? 'left' : 'right'

        return (
          <primitive key={n} object={object}>
            {handedness === hand && (
              <GUI
                {...{
                  rStatsRef,
                  worldScaleGroupRef,
                  aspectRatio,
                  poses,
                  characterModels,
                  objectModels,
                  poseTextures,
                  objectTextures,
                  characterTextures,
                  guiMode,
                  addMode,
                  currentBoard,
                  selectedObject,
                  hideArray,
                  virtualCamVisible,
                  flipHand,
                  selectorOffset,
                  guiSelector,
                  helpToggle,
                  helpSlide,
                  guiCamFOV,
                  vrControllers
                }}
              />
            )}
            <SGController
              {...{ flipModel, modelData: getModelData(controllerObjectSettings), ...controllerObjectSettings }}
            />
          </primitive>
        )
      })}
    </group>
  )

  const selectedObj3d = worldScaleGroupRef.current ? worldScaleGroupRef.current.children.find(child => child.userData.id === selectedObject) : undefined

  let sceneObjectComponents = Object.values(sceneObjects)
    .map((sceneObject, i) => {
      const isSelected = selectedObj3d && selectedObj3d.userData.id === sceneObject.id
        ? true
        : false

      switch (sceneObject.type) {
        case 'camera':
          return (
            <SGVirtualCamera key={i} {...{ aspectRatio, selectedObject, hideArray, virtualCamVisible, modelData: getModelData(cameraObjectSettings), isSelected, ...sceneObject }}>
              {isSelected && <primitive object={soundBeam.current} />}
            </SGVirtualCamera>
          )
        case 'character':
          const hmdCam = hmdCamera.current
          return (
            <SGCharacter
              key={i}
              {...{ modelData: getModelData(sceneObject), worldScale, isSelected, updateObject, selectedBone, hmdCam, ...sceneObject }}
            >
              {isSelected && <primitive object={soundBeam.current} />}
            </SGCharacter>
          )
        case 'object':
          return <SGModel key={i} {...{ modelData: getModelData(sceneObject), isSelected, ...sceneObject }}>
              {isSelected && <primitive object={soundBeam.current} />}
            </SGModel>
        case 'light':
          return <SGSpotLight key={i} {...{ isSelected, ...sceneObject }}>
            {isSelected && <primitive object={soundBeam.current} />}
          </SGSpotLight>
      }
    })
    .filter(Boolean)

  const teleportTexture = useMemo(() => new THREE.TextureLoader().load('/data/system/xr/teleport.png'), [])
  const groundTexture = useMemo(() => new THREE.TextureLoader().load('/data/system/grid_floor.png'), [])
  const wallTexture = useMemo(
    () =>
      new THREE.TextureLoader().load('/data/system/grid_wall2.png', texture => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        texture.offset.set(0, 0)
        texture.repeat.set(4.5, 4.5)
      }),
    []
  )
  const worldComponent = (
    <SGWorld
      {...{
        key: world,
        groundTexture,
        wallTexture,
        world,
        modelData:
          world.environment.file &&
          getModelData({
            model: world.environment.file,
            type: 'environment'
          })
      }}
    />
  )

  return (
    <>
      {activeCameraComponent}
      <group ref={worldScaleGroupRef} userData={{ type: 'world-scale' }} scale={[worldScale, worldScale, worldScale]}>
        {sceneObjectComponents.concat(worldComponent)}
      </group>
      <mesh userData={{ type: 'raycastGround' }} rotation={new THREE.Euler(-Math.PI / 2, 0, 0)}>
        <planeGeometry attach="geometry" args={[100, 100]} />
        <meshBasicMaterial attach="material" visible={false} />
      </mesh>
      <group position={[0, 0.5 * worldScale, 0]}>
        <mesh ref={teleportLocRef} userData={{ type: 'teleportLocator' }} visible={teleportMode}>
          <cylinderGeometry attach="geometry" args={[0.5 * worldScale, 0.5 * worldScale, 1 * worldScale, 32, 1, true]} />
          <meshBasicMaterial
            attach="material"
            opacity={0.25}
            color={0x7a72e9}
            transparent={true}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          >
            <primitive attach="map" object={teleportTexture} />
          </meshBasicMaterial>
        </mesh>
      </group>
    </>
  )
})

const XRStartButton = ({ }) => {
  const { gl } = useThree()

  useMemo(() => {
    document.body.appendChild(WEBVR.createButton(gl))
  }, [])

  return null
}

const SceneManagerXR = connect(
  state => ({
    aspectRatio: state.aspectRatio,
    models: state.models,
    presets: {
      poses: state.presets.poses,
      characters: {},
      scenes: {}
    },

    world: getWorld(state),
    sceneObjects: getSceneObjects(state),
    selectedBone: getSelectedBone(state),
    activeCamera: getActiveCamera(state)
  }),
  {
    createObject,
    updateObject,
    deleteObjects,
    duplicateObjects,
    selectBone,
    updateCharacterSkeleton,
    undo: ActionCreators.undo,
    redo: ActionCreators.redo
  }
)(
  ({
    aspectRatio,
    models,
    presets,
    world,
    sceneObjects,
    activeCamera,
    createObject,
    updateObject,
    deleteObjects,
    duplicateObjects,
    selectedBone,
    selectBone,
    updateCharacterSkeleton,
    undo,
    redo
  }) => {
    const store = useStore()

    const [isLoading, setIsLoading] = useState(false)
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
    const [attachments, attachmentsDispatch] = useAttachmentLoader()

    // app model files
    useMemo(() => {
      [
        controllerObjectSettings,
        cameraObjectSettings
      ].forEach(loadable =>
        attachmentsDispatch({
          type: 'PENDING',
          payload: { id: getFilepathForLoadable(loadable) }
        })
      )
    }, [])

    // world model files
    useMemo(() => {
      if (world.environment.file) {
        attachmentsDispatch({
          type: 'PENDING',
          payload: {
            id: getFilepathForLoadable({
              type: 'environment',
              model: world.environment.file
            })
          }
        })
      }
    }, [world.environment])

    // scene object model files
    useMemo(() => {
      let loadables = Object.values(sceneObjects)
        // has a value for model
        .filter(o => o.model != null)
        // has not loaded yet
        .filter(o => o.loaded !== true)
        // is not a box
        .filter(o => !(o.type === 'object' && o.model === 'box'))

      loadables.forEach(loadable =>
        attachmentsDispatch({
          type: 'PENDING',
          payload: { id: getFilepathForLoadable(loadable) }
        })
      )
    }, [sceneObjects])

    useMemo(() => {
      let incomplete = a => a.status !== 'Success' && a.status !== 'Error'
      let remaining = Object.values(attachments).filter(incomplete)

      if (isLoading && !hasLoadedOnce && remaining.length === 0) {
        setHasLoadedOnce(true)
        setIsLoading(false)
      } else if (remaining.length > 0) {
        setIsLoading(true)
      }
    }, [attachments, sceneObjects, hasLoadedOnce, isLoading])

    const getModelData = sceneObject => {
      let key = getFilepathForLoadable(sceneObject)
      return attachments[key] && attachments[key].value
    }

    return (
      <>
        {
          !hasLoadedOnce && <div style={
            {
              position: 'absolute',

              bottom: 'auto',
              top: 'calc(50% - 20px)',

              padding: '12px 6px',
              border: '3px solid #fff',
              borderRadius: '9px',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              font: 'normal 13px sans-serif',
              textAlign: 'center',
              opacity: '0.5',
              outline: 'none',
              zIndex: '999',

              left: 'calc(50% - 75px)',
              width: 150,

              cursor: 'default'
            }
          }>LOADING …</div>
        }
        <Canvas vr>
          <Provider store={store}>
            {
              hasLoadedOnce && <XRStartButton />
            }
            <SceneContent
              {...{
                aspectRatio,
                models,
                presets,
                sceneObjects,
                getModelData,
                activeCamera,
                world,
                createObject,
                updateObject,
                deleteObjects,
                duplicateObjects,
                selectedBone,
                selectBone,
                updateCharacterSkeleton,
                undo,
                redo
              }}
            />
          </Provider>
        </Canvas>
        <div className="scene-overlay"></div>
      </>
    )
  })

module.exports = SceneManagerXR
