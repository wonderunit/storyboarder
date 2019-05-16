const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useUpdate, useRender } = require('./lib/react-three-fiber')

const { connect } = require('react-redux')
const React = require('react')
const { useEffect, useRef, useMemo, useState, useReducer } = React

const {
  updateObject,

  getSceneObjects,
  getWorld,
  getActiveCamera
} = require('../../shared/reducers/shot-generator')

const { WEBVR } = require('../../vendor/three/examples/js/vr/WebVR')
require('../../vendor/three/examples/js/loaders/LoaderSupport')
require('../../vendor/three/examples/js/loaders/GLTFLoader')
require('../../vendor/three/examples/js/loaders/OBJLoader2')

const SGWorld = require('./components/SGWorld')
const SGSpotLight = require('./components/SGSpotLight')
const SGCamera = require('./components/SGCamera')
const SGVirtualCamera = require('./components/SGVirtualCamera')
const SGModel = require('./components/SGModel')
const SGController = require('./components/SGController')
const SGCharacter = require('./components/SGCharacter')
const GUI = require('./gui/GUI')

const { getIntersections, intersectObjects } = require('./utils/xrControllerFuncs')
require('./lib/VRController')

const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
objLoader.setLogging(false, false)
THREE.Cache.enabled = true

const controllerObjectSettings = {
  id: 'controller',
  model: 'controller-left',
  displayName: 'Controller',
  depth: 0.025,
  height: 0.025,
  width: 0.025,
  rotation: { x: (Math.PI / 180) * -45, y: 0, z: 0 },
  type: 'object',
  visible: true,
  x: 0,
  y: 0,
  z: 0
}

const getFilepathForLoadable = ({ type, model }) => {
  // does the model name have a slash in it?
  // TODO support windows file delimiter
  let isUserModel = !!model.match(/\//)

  if (isUserModel) {
    const parts = model.split(/\//)
    const filename = parts[parts.length - 1]

    switch (type) {
      case 'character':
        return `/data/user/characters/${filename}`
      case 'object':
        return `/data/user/objects/${filename}`
      case 'environment':
        return `/data/user/environments/${filename}`
      default:
        return null
    }
  } else {
    switch (type) {
      case 'character':
        return `/data/system/dummies/gltf/${model}.glb`
      case 'object':
        return `/data/system/objects/${model}.glb`
      default:
        return null
    }
  }
}

const useAttachmentLoader = ({ sceneObjects, world }) => {
  // TODO why do PENDING and SUCCESS get dispatched twice?
  const [attachments, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case 'PENDING':
        // ignore if already exists
        return (state[action.payload.id])
          ? state
          : {
            ...state,
            [action.payload.id]: { status: 'NotAsked' }
          }
      case 'LOAD':
        // ignore if already loading
        return (state[action.payload.id].loading)
          ? state
          : {
            ...state,
            [action.payload.id]: { status: 'Loading', progress: undefined }
          }
      case 'PROGRESS':
        return {
          ...state,
          [action.payload.id]: {
            ...[action.payload.id],
            progress: {
              loaded: action.payload.progress.loaded,
              total: action.payload.progress.total,
              percent: Math.floor(action.payload.progress.loaded/action.payload.progress.total) * 100
            }
          }
        }
      case 'SUCCESS':
        return {
          ...state,
          [action.payload.id]: { status: 'Success', value: action.payload.value }
        }
      case 'ERROR':
        return {
          ...state,
          [action.payload.id]: { status: 'Error', error: action.payload.error }
        }
      default:
        return state
      }
    }, {})

  useMemo(() => {
    let loadables = Object.values(sceneObjects)
      // has a value for model
      .filter(o => o.model != null)
      // has not loaded yet
      .filter(o => o.loaded !== true)
      // is not a box
      .filter(o => !(o.type === 'object' && o.model === 'box'))

    world.environment.file && loadables.push(
      { type: 'environment', model: world.environment.file }
    )

    loadables.push(controllerObjectSettings)

    loadables.forEach(o =>
      dispatch({ type: 'PENDING', payload: { id: getFilepathForLoadable({ type: o.type, model: o.model }) } })
    )
  }, [sceneObjects])

  useMemo(() => {
    Object.entries(attachments)
      .filter(([k, v]) => v.status === 'NotAsked')
      .forEach(([k, v]) => {
        gltfLoader.load(
          k,
          value => dispatch({ type: 'SUCCESS', payload: { id: k, value } }),
          progress => dispatch({ type: 'PROGRESS', payload: { id: k, progress } }),
          error => dispatch({ type: 'ERROR', payload: { id: k, error } })
        )
        dispatch({ type: 'LOAD', payload: { id: k } })
      })
  }, [attachments])

  return attachments
}

const SceneContent = ({
  aspectRatio,
  sceneObjects,
  getModelData,
  activeCamera,
  world,
  updateObject
}) => {
  const renderer = useRef(null)
  const xrOffset = useRef(null)

  const [isXR, setIsXR] = useState(false)
  const [guiMode, setGuiMode] = useState(null)
  const [virtualCamVisible, setVirtualCamVisible] = useState(true)
  const [currentBoard, setCurrentBoard] = useState(null)
  const [camExtraRot, setCamExtraRot] = useState(0)
  const [teleportPos, setTeleportPos] = useState(null)
  const [selectedObject, setSelectedObject] = useState(null)
  const [XRControllers, setXRControllers] = useState({})

  const turnCamera = useRef(null)
  const XRControllersRef = useRef({})
  const intersectArray = useRef([])
  const teleportArray = useRef([])
  const teleportMode = useRef(false)

  XRControllersRef.current = XRControllers

  const findParent = obj => {
    while (obj) {
      if (!obj.parent || obj.parent.type === 'Scene') {
        return obj
      }
      obj = obj.parent
    }

    return null
  }

  const { gl, scene, camera, setDefaultCamera } = useThree()

  const onVRControllerConnected = event => {
    let id = THREE.Math.generateUUID()

    let controller = event.detail
    controller.standingMatrix = gl.vr.getStandingMatrix()

    // TODO
    // controller.head = window.camera

    controller.addEventListener('trigger press began', onSelectStart)
    controller.addEventListener('trigger press ended', onSelectEnd)
    controller.addEventListener('grip press began', onGripDown)
    controller.addEventListener('grip press ended', onGripUp)
    controller.addEventListener('thumbstick axes changed', onAxisChanged)
    controller.addEventListener('thumbpad axes changed', onAxisChanged)

    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])
    const material = new THREE.LineBasicMaterial({
      color: 0x0000ff
    })

    const line = new THREE.Line(geometry, material)
    line.name = 'line'
    line.scale.z = 5
    line.rotation.x = (Math.PI / 180) * -45
    controller.add(line)

    const raycastTiltGroup = new THREE.Group()
    const raycastDepth = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial())
    raycastDepth.visible = false
    raycastDepth.name = 'raycast-depth'
    raycastTiltGroup.rotation.x = (Math.PI / 180) * -45
    raycastTiltGroup.add(raycastDepth)

    controller.add(raycastTiltGroup)

    controller.intersections = []
    controller.pressed = false
    controller.gripped = false
    controller.interaction = {
      grip: undefined,
      press: undefined,
      hover: undefined
    }

    controller.addEventListener('disconnected', function(event) {
      controller.parent.remove(controller)

      // Try if this works as expected?
      const { id, ...controllers } = XRControllers
      setXRControllers(controllers)
    })

    setXRControllers(prev => {
      return { ...prev, [id]: controller }
    })
  }
  
  const updateGUIProp = e => {
    const { id, prop, value } = e.detail

    switch (prop) {
      case 'mesomorphic':
      case 'ectomorphic':
      case 'endomorphic':
        // updateObject(id, {
        //   morphTargets: {
        //     mesomorphic: value,
        //     ectomorphic: value,
        //     endomorphic: value
        //   }
        // })
        break
      default:
        updateObject(id, { [prop]: value })
        break
    }
  }

  useEffect(() => {
    window.addEventListener('updateRedux', updateGUIProp)
    window.addEventListener('vr controller connected', onVRControllerConnected)
    return () => {
      window.removeEventListener('updateRedux', updateGUIProp)
      window.removeEventListener('vr controller connected', onVRControllerConnected)
    }
  }, [])

  useRender(() => {
    THREE.VRController.update()

    Object.values(XRControllersRef.current).forEach(controller => {
      const intersections = getIntersections(controller, intersectArray.current)
      if (intersections.length > 0) {
        let intersection = intersections[0]
        if (intersection.object.userData.type === 'slider') {
          controller.intersections = intersections
        }
      }

      const object = controller.userData.selected

      if (object && object.userData.type === 'character') {
        constraintObjectRotation(controller)
      }
    })
  })

  const constraintObjectRotation = controller => {
    const object = controller.userData.selected

    const raycastDepth = controller.getObjectByName('raycast-depth')
    const depthWorldPos = raycastDepth.getWorldPosition(new THREE.Vector3())
    depthWorldPos.sub(controller.userData.posOffset)
    object.position.copy(depthWorldPos)

    const quaternion = new THREE.Quaternion()
    controller.matrixWorld.decompose(new THREE.Vector3(), quaternion, new THREE.Vector3())
    const newMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(),
      quaternion,
      new THREE.Vector3(1, 1, 1)
    )

    const rotVector = new THREE.Vector3(1, 0, 0).applyMatrix4(newMatrix)
    const rotTheta = Math.atan2(rotVector.y, rotVector.x)
    object.rotation.y = -rotTheta + object.userData.modelSettings.rotation + controller.userData.rotOffset
  }

  const onTeleport = event => {
    var controller = event.target
    const intersect = intersectObjects(controller, teleportArray.current)

    if (intersect && intersect.distance < 10) {
      // console.log('try to teleport')
      Object.values(XRControllers).forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      setTeleportPos(intersect.point)
    }
  }

  const onSelectStart = event => {
    if (teleportMode.current) {
      onTeleport(event)
      return
    }

    const controller = event.target
    const intersections = getIntersections(controller, intersectArray.current)
    
    if (intersections.length > 0) {
      let intersection = intersections[0]

      if (intersection.object.userData.type === 'slider') {
        controller.pressed = true
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
          setGuiMode(mode)
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
          if (button === 'eye')
            setVirtualCamVisible(oldValue => {
              return !oldValue
            })
        }

        return
      }

      const object = findParent(intersection.object)
      controller.userData.selected = object

      if (object.userData.type === 'character') {
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
      } else {
        const tempMatrix = new THREE.Matrix4()
        tempMatrix.getInverse(controller.matrixWorld)

        object.matrix.premultiply(tempMatrix)
        object.matrix.decompose(object.position, object.quaternion, object.scale)
        controller.add(object)
      }

      const objMaterial = intersection.object.material
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
  }

  const onSelectEnd = event => {
    const controller = event.target
    controller.pressed = false

    if (controller.userData.selected !== undefined) {
      const object = controller.userData.selected

      if (object.userData.type !== 'character') {
        object.matrix.premultiply(controller.matrixWorld)
        object.matrix.decompose(object.position, object.quaternion, object.scale)
        scene.add(object)
      }

      controller.userData.selected = undefined

      object.traverse(child => {
        if (child instanceof THREE.Mesh) {
          const objMaterial = child.material
          if (Array.isArray(objMaterial)) {
            objMaterial.forEach(material => {
              if (!material.emissive) return
              material.emissive.b = 0
            })
          } else {
            if (!objMaterial.emissive) return
            objMaterial.emissive.b = 0
          }
        }
      })

      if (object.userData.type === 'character' || object.userData.type === 'light') {

        console.log(object.userData.id, object.position.x)

        updateObject(object.userData.id, {
          x: object.position.x,
          y: object.position.z,
          z: object.position.y,
          rotation: object.rotation.y
        })
      } else if (object.userData.type === 'virtual-camera') {
        updateObject(object.userData.id, {
          x: object.position.x,
          y: object.position.z,
          z: object.position.y
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
  }

  const onAxisChanged = event => {
    if (event.axes[0] === 0) {
      turnCamera.current = null
    }

    if (turnCamera.current) return

    if (event.axes[0] > 0.075) {
      Object.values(XRControllers).forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      turnCamera.current = 'Right'
      setCamExtraRot(oldRot => {
        return oldRot - 1
      })
    }

    if (event.axes[0] < -0.075) {
      Object.values(XRControllers).forEach(controller => {
        controller.dispatchEvent({ type: 'trigger press ended' })
      })

      turnCamera.current = 'Left'
      setCamExtraRot(oldRot => {
        return oldRot + 1
      })
    }
  }

  useEffect(() => {

    
    intersectArray.current = scene.children.filter(
      child => (child instanceof THREE.Mesh || child instanceof THREE.Group) 
      && (child.userData.type !== 'ground' && child.userData.type !== 'room' && child.userData.type !== 'camera')
    )

    Object.values(XRControllers).forEach(controller => {
      const gui = controller.children.filter(child => child.userData.type === 'gui')[0]
      if (gui) intersectArray.current.push(gui)
    })

    teleportArray.current = scene.children.filter(child => child.userData.type === 'ground')
  })

  const onGripDown = event => {
    teleportMode.current = true

    const controller = event.target
    const intersections = getIntersections(controller, intersectArray.current)
    
    if (intersections.length > 0) {
      let intersection = intersections[0]
      if (intersection.object.userData.type === 'slider') {
        controller.gripped = true
        return
      }

      const { id } = intersection.object
      setSelectedObject(id)
    }
  }

  const onGripUp = event => {
    teleportMode.current = false

    const controller = event.target
    controller.gripped = false
  }

  useEffect(() => {
    if (!renderer.current) {
      navigator.getVRDisplays().then(displays => {
        // console.log({ displays })
        if (displays.length) {
          renderer.current = gl
          scene.background = new THREE.Color(world.backgroundColor)
          setIsXR(true)
          // console.log('isXR is now', isXR)
          document.body.appendChild(WEBVR.createButton(gl))
          gl.vr.enabled = true
        }
      })
      .catch(err => console.error(err))
    }
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
  } else if (xrOffset.current && !camPosZero && camera.position.y !== xrOffset.current.userData.z) {
    const {x, y, rotation } = xrOffset.current.userData
    const behindCam = {
      x: Math.sin(rotation),
      y: Math.cos(rotation)
    }

    xrOffset.current.position.x = x + behindCam.x
    xrOffset.current.position.z = y + behindCam.y
  }



  let cameraState = sceneObjects[activeCamera]

  let activeCameraComponent = (
    <group
      key={'camera'}
      ref={xrOffset}
      rotation={[0, (Math.PI / 4) * camExtraRot, 0]}
      userData={{
        x: cameraState.x,
        y: cameraState.y,
        z: cameraState.z,
        rotation: cameraState.rotation,
        type: cameraState.type
      }}
    >
      <SGCamera {...{ aspectRatio, activeCamera, setDefaultCamera, ...cameraState }} />

      {Object.values(XRControllers).map((object, n) => {
        const handedness = object.getHandedness()
        const flipModel = handedness === 'right'

        return (
          <primitive key={n} object={object}>
            {handedness === 'right' && (
              <GUI {...{ aspectRatio, guiMode, currentBoard, selectedObject, virtualCamVisible, XRControllers }} />
            )}
            <SGController
              {...{ flipModel, modelData: getModelData(controllerObjectSettings), ...controllerObjectSettings }}
            />
          </primitive>
        )
      })}
    </group>
  )

  let sceneObjectComponents = Object.values(sceneObjects).map((sceneObject, i) => {
    switch (sceneObject.type) {
      case 'camera':
        return virtualCamVisible ? (
          <SGVirtualCamera key={i} {...{ aspectRatio, showBorder: true, ...sceneObject }} />
        ) : (
          undefined
        )
      case 'character':
        return <SGCharacter key={i} {...{ modelData: getModelData(sceneObject), ...sceneObject }} />
      case 'object':
        return <SGModel key={i} {...{ modelData: getModelData(sceneObject), ...sceneObject }} />
      case 'light':
        return <SGSpotLight key={i} {...{ ...sceneObject }} />
    }
  }).filter(Boolean)

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
  const worldComponent = <SGWorld {...{
      key: world,
      groundTexture,
      wallTexture,
      world,
      modelData: world.environment.file && getModelData({
        model: world.environment.file,
        type: 'environment'
      })
    }} />

  // wait until the camera is setup before showing the scene
  const ready = !!xrOffset.current

  // console.log('scene is', ready ? 'shown' : 'not shown')

  return <>
    {activeCameraComponent}
    {sceneObjectComponents.concat(worldComponent)}
  </>
}

const SceneManagerXR = connect(
  state => ({
    aspectRatio: state.aspectRatio,

    world: getWorld(state),
    sceneObjects: getSceneObjects(state),
    activeCamera: getActiveCamera(state)
  }),
  {
    updateObject
  }
)(({ aspectRatio, world, sceneObjects, activeCamera, updateObject }) => {
  const attachments = useAttachmentLoader({ sceneObjects, world })
  
  const getModelData = sceneObject => {
    let key = getFilepathForLoadable(sceneObject)
    return attachments[key] && attachments[key].value
  }

  return (
    <Canvas>
      <SceneContent {...{
          aspectRatio,
          sceneObjects,
          getModelData,
          activeCamera,
          world,
          updateObject
        }} />
    </Canvas>
  )
})

module.exports = SceneManagerXR
