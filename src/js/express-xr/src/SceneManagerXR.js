const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useRender } = require('react-three-fiber')

const { connect } = require('react-redux')
const React = require('react')
const { useEffect, useRef, useMemo, useState, useReducer } = React

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
  getSelectedBone
} = require('../../shared/reducers/shot-generator')

// all pose presets (so we can use `stand` for new characters)
const defaultPosePresets = require('../../shared/reducers/shot-generator-presets/poses.json')
// id of the pose preset used for new characters
const DEFAULT_POSE_PRESET_ID = '79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE'

const { WEBVR } = require('../../vendor/three/examples/js/vr/WebVR')

const SGWorld = require('./components/SGWorld')
const SGSpotLight = require('./components/SGSpotLight')
const SGCamera = require('./components/SGCamera')
const SGVirtualCamera = require('./components/SGVirtualCamera')
const SGModel = require('./components/SGModel')
const SGController = require('./components/SGController')
const SGCharacter = require('./components/SGCharacter')
const GUI = require('./gui/GUI')

const { controllerObjectSettings, cameraObjectSettings } = require('./utils/xrObjectSettings')
const { getIntersections, boneIntersect, intersectObjects, constraintObjectRotation, setControllerData } = require('./utils/xrControllerFuncs')
const { findParent, moveObject, rotateObject, createHideArray, updateObjectHighlight } = require('./utils/xrHelperFuncs')
const { useAttachmentLoader, getFilepathForLoadable } = require('./hooks/useAttachmentLoader')
const applyDeviceQuaternion = require('../../shot-generator/apply-device-quaternion')
require('./lib/VRController')

// const RStats = require('./lib/rStats')
// require('./lib/rStats.extras')

// preload audio immediately into cache
new THREE.AudioLoader().load('data/snd/vr-select.ogg', () => {})
new THREE.AudioLoader().load('data/snd/vr-welcome.ogg', () => {})
new THREE.AudioLoader().load('data/snd/vr-beam2.mp3', () => {})
  // new THREE.AudioLoader().load('data/snd/vr-atmosphere.mp3', () => {})

const useVrControllers = ({ onSelectStart, onSelectEnd, onGripDown, onGripUp, onAxisChanged }) => {
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

const SceneContent = ({
  aspectRatio,
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
  updateCharacterSkeleton
}) => {
  // const rStatsRef = useRef(null)
  const xrOffset = useRef(null)

  const [guiMode, setGuiMode] = useState('selection')
  const [addMode, setAddMode] = useState(null)
  const [virtualCamVisible, setVirtualCamVisible] = useState(true)
  const [flipHand, setFlipHand] = useState(false)
  const [currentBoard, setCurrentBoard] = useState(null)
  const [camExtraRot, setCamExtraRot] = useState(0)
  const [teleportPos, setTeleportPos] = useState(null)
  const [selectedObject, setSelectedObject] = useState(null)
  const [guiCamFOV, setGuiCamFOV] = useState(22)
  const [hideArray, setHideArray] = useState([])
  const [worldScale, setWorldScale] = useState(1)

  const worldScaleRef = useRef(0.1)
  const worldScaleGroupRef = useRef([])
  const moveCamRef = useRef(null)
  const rotateCamRef = useRef(null)
  const intersectArray = useRef([])
  const guiArray = useRef([])
  const teleportArray = useRef([])
  const teleportMode = useRef(false)
  const initialCamPos = useRef()
  const hmdCamInitialized = useRef(false)

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

  const { gl, scene, camera, setDefaultCamera } = useThree()

  const onUpdateGUIProp = e => {
    const { id, prop, value } = e.detail

    if (prop === 'guiFOV') {
      setGuiCamFOV(value)
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

    if (intersect && intersect.distance < 10) {
      // console.log('try to teleport')
      vrControllers.forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      setTeleportPos(intersect.point.multiplyScalar(1 / worldScale))
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
    soundSelect.current.play()

    const controller = event.target
    controller.pressed = true

    if (teleportMode.current) {
      onTeleport(event)
      return
    }

    const otherController = vrControllers.find(i => i.uuid !== controller.uuid)
    if (otherController && otherController.userData.selected) return
    if (controller.gripped) return

    const intersections = getIntersections(controller, intersectArray.current)

    if (intersections.length > 0) {
      onIntersection(controller, intersections)
    } else {
      setSelectedObject(0)
      selectedObjRef.current = null
      setHideArray(createHideArray(scene))
    }
  }

  const onIntersection = (controller, intersections) => {
      let intersection = intersections[0]
      if (intersection.object.userData.type === 'bone') return

      if (intersection.object.userData.type === 'slider') {
        controller.intersections = intersections
        return
      }

      if (intersection.object.userData.type === 'view') {
        intersection = intersections[1]
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
          }
        }

        return
      }

      if (intersection.object.userData.type === 'hitter' && intersection.object.parent.userData.character) {
        if (!intersection.object.parent.userData.character) return
        intersection.object = intersection.object.parent.userData.character
      }

      let object = findParent(intersection.object)
      const { id } = object
      setSelectedObject(id)
      selectedObjRef.current = scene.getObjectById(id)
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

      let objMaterial
      if (intersection.object.type === 'LOD') objMaterial = intersection.object.children[0].material
      else objMaterial = intersection.object.material

      if (Array.isArray(objMaterial)) {
        objMaterial.forEach(material => {
          if (!material.emissive) return
          material.emissive.b = 0.15
        })
      } else {
        if (!objMaterial.emissive) return
        objMaterial.emissive.b = 0.15
      }
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
          setSelectedObject(match.id)
          selectedObjRef.current = match
          setHideArray(createHideArray(scene))
          setGuiMode('selection')
        }, 250)
        break
    }
  }

  const onAddObject = mode => {
    const id = THREE.Math.generateUUID()

    const hmdCam = xrOffset.current.children.filter(child => child.type === 'PerspectiveCamera')[0]
    let offsetVector
    if (mode == 'camera') {
      offsetVector = new THREE.Vector3(0, 0, -1)
    } else {
      offsetVector = new THREE.Vector3(0, 0, -2)
    }
    offsetVector.applyMatrix4(new THREE.Matrix4().extractRotation(hmdCam.matrixWorld))
    offsetVector.multiply(new THREE.Vector3(1, 0, 1)).multiplyScalar(worldScale === 1 ? 1 : 0.5 / worldScale)
    const newPoz = xrOffset.current.position
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

      updateObjectHighlight(object)
      useUpdateObject(object)
    }
  }

  const useUpdateObject = object => {
    if (object.userData.type === 'character') {
      updateObject(object.userData.id, {
        x: object.position.x,
        y: object.position.z,
        z: object.position.y,
        rotation: object.rotation.y
      })
    } else if (object.userData.type === 'light') {
      const euler = new THREE.Euler().setFromQuaternion(object.quaternion, 'YXZ')

      updateObject(object.userData.id, {
        x: object.position.x,
        y: object.position.z,
        z: object.position.y,
        rotation: euler.y,
        tilt: euler.x
      })
    } else if (object.userData.type === 'virtual-camera') {
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

    const { x, y } = xrOffset.current.userData
    const hmdCam = xrOffset.current.children.filter(child => child.type === 'PerspectiveCamera')[0]
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
      setCamExtraRot(oldRot => {
        return oldRot - 1
      })
    }

    if (event.axes[0] < -0.075) {
      vrControllers.forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      rotateCamRef.current = 'Left'
      setCamExtraRot(oldRot => {
        return oldRot + 1
      })
    }
  }

  const onGripDown = event => {
    teleportMode.current = true
    
    const controller = event.target
    controller.gripped = true

    const otherController = vrControllers.find(i => i.uuid !== controller.uuid)
    if (!selectedObjRef.current && otherController && otherController.gripped) {
      setWorldScale(oldValue => {
        return oldValue === 1 ? worldScaleRef.current : 1
      })
      const hmdCam = xrOffset.current.children.filter(child => child.type === 'PerspectiveCamera')[0]
      const teleport =
        worldScale !== 1
          ? new THREE.Vector3(cameraState.x, cameraState.z, cameraState.y)
          : new THREE.Vector3(-hmdCam.position.x, 0, -hmdCam.position.z + 0.5)

      setTeleportPos(teleport)
      setCamExtraRot(0)
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
      const { id } = object
      setSelectedObject(id)
      selectedObjRef.current = scene.getObjectById(id)
      setHideArray(createHideArray(scene))
      setGuiMode('selection')
    } else {
      setSelectedObject(0)
      selectedObjRef.current = null
      setHideArray(createHideArray(scene))
    }
  }

  const onGripUp = event => {
    teleportMode.current = false

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
    onSelectStart, onSelectEnd, onGripDown, onGripUp, onAxisChanged
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
    // if (rStatsRef.current) {
    //   rStatsRef.current('rAF').tick()
    //   rStatsRef.current('FPS').frame()
    //   rStatsRef.current().update()
    // }

    THREE.VRController.update()

    vrControllers.forEach((controller, idx) => {

      if (selectedObjRef.current && selectedObjRef.current.userData.type === 'character' && !selectedBone) {
        const bonesHelper = selectedObjRef.current.children[0].bonesHelper
        const hits = bonesHelper ? boneIntersect(controller, bonesHelper) : []
        if (hits.length) {
          controller.userData.currentBoneHighlight = hits[0].bone
          controller.userData.currentBoneHighlight.connectedBone.material.color = new THREE.Color(0x242246)
        } else if (controller.userData.currentBoneHighlight) {
          controller.userData.currentBoneHighlight.connectedBone.material.color = new THREE.Color(0x7a72e9)
          controller.userData.currentBoneHighlight = null
        }
      }

      const otherController = vrControllers[1 - idx]
      if (otherController && !otherController.pressed && !controller.userData.selected) {
        const intersections = getIntersections(controller, guiArray.current)
        if (intersections.length > 0) {
          let intersection = intersections[0]
          if (intersection.object.userData.type === 'slider') {
            controller.intersections = intersections
          }
        }
      }

      const object = controller.userData.selected
      if (object && object.userData.type === 'character') {
        constraintObjectRotation(controller, worldScale)
      }

      if (controller.pressed === true) {
        if (object && object.userData.type === 'object' && controller.gripped) {
          if (object.parent.uuid === controller.uuid) {
            object.matrix.premultiply(controller.matrixWorld)
            object.matrix.decompose(object.position, object.quaternion, new THREE.Vector3())
            object.scale.set(object.scale.x / worldScale, object.scale.y / worldScale, object.scale.z / worldScale)
            object.position.multiplyScalar(1 / worldScale)

            object.userData.order = object.rotation.order
            object.rotation.reorder('YXZ')

            const sign = Math.sign(object.rotation.y)
            let degreeY =  THREE.Math.radToDeg(Math.abs(object.rotation.y)) / 22.5
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
          } else {
            constraintObjectRotation(controller, worldScale)
          }
        }
      }

      if (controller.userData.bone) rotateBone(controller)
    })
  }, false, [vrControllers, selectedBone, worldScale])

  useEffect(() => {
    navigator
      .getVRDisplays()
      .then(displays => {
        // console.log({ displays })
        if (displays.length) {
          console.log('adding VR button')
          scene.background = new THREE.Color(world.backgroundColor)
          document.body.appendChild(WEBVR.createButton(gl))
        }
      })
      .catch(err => console.error(err))
    // const threeStats = new window.threeStats(gl)
    // rStatsRef.current = new RStats({
    //   css: [],
    //   values: {
    //     fps: { caption: 'fps', below: 30 }
    //   },
    //   groups: [{ caption: 'Framerate', values: ['fps', 'raf'] }],
    //   plugins: [threeStats]
    // })
  }, [])

  // if our camera is setup
  // if (activeCamera === camera.userData.id) {
  //   console.log('camera: using user-defined camera')
  // } else {
  //   console.log('camera: using Canvas camera')
  // }

  const camPosZero = camera.position.length() === 0
  if (xrOffset.current && teleportPos) {
    xrOffset.current.position.x = teleportPos.x
    xrOffset.current.position.z = teleportPos.z
  } else if (xrOffset.current && !camPosZero && camera.position.y !== xrOffset.current.userData.z && !hmdCamInitialized.current) {
    const { x, y, rotation } = xrOffset.current.userData
    const behindCam = {
      x: Math.sin(rotation),
      y: Math.cos(rotation)
    }

    xrOffset.current.position.x = x + behindCam.x
    xrOffset.current.position.z = y + behindCam.y
    hmdCamInitialized.current = true
  }

  let cameraState = sceneObjects[activeCamera]
  useEffect(() => {
    // Store Initial Camera Position here so HMD doesn't jump even if virtual camera get's updated
    const { x, y, z } = cameraState
    initialCamPos.current = new THREE.Vector3(x, y, z)
  }, [])

  useEffect(() => {
    const hmdCam = xrOffset.current.children.filter(child => child.type === 'PerspectiveCamera')[0]
    if (worldScale !== 1) {
      xrOffset.current.position.y = -(hmdCam.position.y - 0.75)
    } else {
      xrOffset.current.position.y = 0
    }
  }, [worldScale])

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

  let activeCameraComponent = (
    <group
      key={'camera'}
      ref={xrOffset}
      rotation={[0, (Math.PI / 4) * camExtraRot, 0]}
      userData={{
        x: initialCamPos.current ? initialCamPos.current.x : cameraState.x,
        y: initialCamPos.current ? initialCamPos.current.y : cameraState.y,
        z: initialCamPos.current ? initialCamPos.current.z : cameraState.z,
        rotation: cameraState.rotation,
        type: cameraState.type
      }}
    >
      <SGCamera {...{ aspectRatio, activeCamera, setDefaultCamera, audioListener, ...cameraState }} />

      {vrControllers.map((object, n) => {
        const handedness = object.getHandedness()
        const flipModel = handedness === 'right'
        const hand = flipHand ? 'left' : 'right'

        return (
          <primitive key={n} object={object}>
            {handedness === hand && (
              <GUI {...{ aspectRatio, guiMode, addMode, currentBoard, selectedObject, hideArray, virtualCamVisible, flipHand, guiCamFOV, vrControllers }} />
            )}
            <SGController
              {...{ flipModel, modelData: getModelData(controllerObjectSettings), ...controllerObjectSettings }}
            />
          </primitive>
        )
      })}
    </group>
  )

  const selectedObject3d = scene.getObjectById(selectedObject)

  let sceneObjectComponents = Object.values(sceneObjects)
    .map((sceneObject, i) => {
      const isSelected = selectedObject3d && selectedObject3d.userData.id === sceneObject.id
        ? true
        : false

      switch (sceneObject.type) {
        case 'camera':
          return (
            <SGVirtualCamera key={i} {...{ aspectRatio, selectedObject, hideArray, virtualCamVisible, modelData: getModelData(cameraObjectSettings), ...sceneObject }}>
              {isSelected && <primitive object={soundBeam.current} />}
            </SGVirtualCamera>
          )
        case 'character':
          const hmdCam = xrOffset.current ? xrOffset.current.children.filter(child => child.type === 'PerspectiveCamera')[0] : null
          return (
            <SGCharacter
              key={i}
              {...{ modelData: getModelData(sceneObject), worldScale, isSelected, updateObject, selectedBone, hmdCam, ...sceneObject }}
            >
              {isSelected && <primitive object={soundBeam.current} />}
            </SGCharacter>
          )
        case 'object':
          return <SGModel key={i} {...{ modelData: getModelData(sceneObject), ...sceneObject }}>
              {isSelected && <primitive object={soundBeam.current} />}
            </SGModel>
        case 'light':
          return <SGSpotLight key={i} {...{ ...sceneObject }}>
            {isSelected && <primitive object={soundBeam.current} />}
          </SGSpotLight>
      }
    })
    .filter(Boolean)

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

  // wait until the camera is setup before showing the scene
  const ready = !!xrOffset.current

  // console.log('scene is', ready ? 'shown' : 'not shown')

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
    </>
  )
}

const SceneManagerXR = connect(
  state => ({
    aspectRatio: state.aspectRatio,

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
    updateCharacterSkeleton
  }
)(
  ({
    aspectRatio,
    world,
    sceneObjects,
    activeCamera,
    createObject,
    updateObject,
    deleteObjects,
    duplicateObjects,
    selectedBone,
    selectBone,
    updateCharacterSkeleton
  }) => {
    const attachments = useAttachmentLoader({ sceneObjects, world })

    const getModelData = sceneObject => {
      let key = getFilepathForLoadable(sceneObject)
      return attachments[key] && attachments[key].value
    }

    return (
      <>
        <Canvas vr>
          <SceneContent
            {...{
              aspectRatio,
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
              updateCharacterSkeleton
            }}
          />
        </Canvas>
        <div className="scene-overlay"></div>
      </>
    )
 })

module.exports = SceneManagerXR