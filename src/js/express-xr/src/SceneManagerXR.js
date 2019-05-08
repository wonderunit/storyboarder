const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useUpdate, useRender } = require('./lib/react-three-fiber')

const { connect } = require('react-redux')
const React = require('react')
const { useEffect, useRef, useMemo, useState, useReducer } = React

const { updateObject } = require('../../shared/reducers/shot-generator')

const { WEBVR } = require('../../vendor/three/examples/js/vr/WebVR')
require('../../vendor/three/examples/js/loaders/LoaderSupport')
require('../../vendor/three/examples/js/loaders/GLTFLoader')
require('../../vendor/three/examples/js/loaders/OBJLoader2')

const SGWorld = require('./components/SGWorld')
const SGSpotLight = require('./components/SGSpotLight')
const SGCamera = require('./components/SGCamera')
const SGVirtualCamera = require('./components/SGVirtualCamera')
const SGModel = require('./components/SGModel')
const SGCharacter = require('./components/SGCharacter')
const GUI = require('./gui/GUI')

const { getIntersections, intersectObjects, cleanIntersected } = require('./utils/xrControllerFuncs')
require('./lib/ViveController')

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
  rotation: { x: -(Math.PI/180)*45, y: 0, z:  0 },
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
console.log({ attachments })
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
  const [camExtraRot, setCamExtraRot] = useState(0)
  const [teleportPos, setTeleportPos] = useState(null)

  const turnCamera = useRef(null)
  const XRController1 = useRef(null)
  const XRController2 = useRef(null)
  const intersectArray = useRef([])
  const teleportArray = useRef([])

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



  useRender(() => {
    if (XRController1.current && XRController2.current) {
      // cleanIntersected()
      handleController(XRController1.current, 0)
      handleController(XRController2.current, 1)

      if (XRController1.current.userData.selected) {
        const object = XRController1.current.userData.selected
        if (object.userData.type === 'character') {
          constraintObjectRotation(XRController1.current)
        }
      }

      if (XRController2.current.userData.selected) {
        const object = XRController2.current.userData.selected
          if (object.userData.type === 'character') {
            constraintObjectRotation(XRController2.current)
          }
        }
    }
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
      XRController1.current.dispatchEvent({ type: 'triggerup' })
      XRController2.current.dispatchEvent({ type: 'triggerup' })

      setTeleportPos(intersect.point)
    }
  }

  const onSelectStart = event => {
    const controller = event.target
    const intersections = getIntersections(controller, intersectArray.current)
    
    if (intersections.length > 0) {
      let intersection = intersections[0]

      if (intersection.object.userData.type === 'view') {
        intersection = intersections[1]
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
      XRController1.current.dispatchEvent({ type: 'triggerup' })
      XRController2.current.dispatchEvent({ type: 'triggerup' })

      turnCamera.current = 'Right'
      setCamExtraRot(oldRot => {
        return oldRot - 1
      })
    }
    
    if (event.axes[0] < -0.075) {
      XRController1.current.dispatchEvent({ type: 'triggerup' })
      XRController2.current.dispatchEvent({ type: 'triggerup' })

      turnCamera.current = 'Left'
      setCamExtraRot(oldRot => {
        return oldRot + 1
      })
    }
  }

  const handleController = (controller, id) => {
    controller.update()
  }

  useEffect(() => {

    
    intersectArray.current = scene.children.filter(
      child => (child instanceof THREE.Mesh || child instanceof THREE.Group) 
      && (child.userData.type !== 'ground' && child.userData.type !== 'room' && child.userData.type !== 'camera')
    )
    // console.log(intersectArray.current)

    teleportArray.current = scene.children.filter(child => child.userData.type === 'ground')
  })

  useEffect(() => {
    if (!renderer.current) {
      navigator.getVRDisplays().then(displays => {
        // console.log({ displays })
        if (displays.length) {
          renderer.current = gl
          scene.background = new THREE.Color(world.backgroundColor)
          setIsXR(true)
          // console.log('isXR is now', isXR)
          if (!XRController1.current && !XRController2.current) {
            document.body.appendChild(WEBVR.createButton(gl))
            gl.vr.enabled = true

            // XRController1 = renderer.current.vr.getController(0)
            XRController1.current = new THREE.ViveController( 0 );
            XRController1.current.standingMatrix = gl.vr.getStandingMatrix()

            XRController1.current.addEventListener('triggerdown', onSelectStart)
            XRController1.current.addEventListener('triggerup', onSelectEnd)
            XRController1.current.addEventListener('gripsdown', onTeleport)
            XRController1.current.addEventListener('axischanged', onAxisChanged)

            // XRController2.current = renderer.current.vr.getController(1)
            XRController2.current = new THREE.ViveController(1)
            XRController2.current.standingMatrix = gl.vr.getStandingMatrix()

            XRController2.current.addEventListener('triggerdown', onSelectStart)
            XRController2.current.addEventListener('triggerup', onSelectEnd)
            XRController2.current.addEventListener('gripsdown', onTeleport)
            XRController2.current.addEventListener('axischanged', onAxisChanged)

            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])
            const material = new THREE.LineBasicMaterial({
              color: 0x0000ff
            })
            
            const line = new THREE.Line(geometry, material)
            line.name = 'line'
            line.scale.z = 5
            XRController1.current.add(line.clone())
            XRController2.current.add(line.clone())

            const raycastDepth = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial())
            raycastDepth.visible = false
            raycastDepth.name = 'raycast-depth'

            XRController1.current.add(raycastDepth.clone())
            XRController2.current.add(raycastDepth.clone())
          }
          // console.log('controllers', XRController1.current, XRController2.current)

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

      {XRController1.current && (
        <primitive object={XRController1.current}>
          <GUI {...{ aspectRatio }} />
          <SGModel {...{ modelData: getModelData(controllerObjectSettings), ...controllerObjectSettings }} />
        </primitive>
      )}
      {XRController2.current && (
        <primitive object={XRController2.current}>
          <GUI {...{ aspectRatio }} />
          <SGModel {...{ modelData: getModelData(controllerObjectSettings), ...controllerObjectSettings }} />
        </primitive>
      )}
    </group>
  )

  let sceneObjectComponents = Object.values(sceneObjects).map((sceneObject, i) => {
    switch (sceneObject.type) {
      case 'camera':
        return <SGVirtualCamera key={i} {...{ aspectRatio, ...sceneObject }} />
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

    world: state.world,
    sceneObjects: state.sceneObjects,
    activeCamera: state.activeCamera
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
