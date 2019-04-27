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
const SGModel = require('./components/SGModel')
const SGCharacter = require('./components/SGCharacter')

const { getIntersections, intersectObjects, cleanIntersected } = require('./utils/xrControllerFuncs')

const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
objLoader.setLogging(false, false)
THREE.Cache.enabled = true

let XRController1, XRController2
const tempMatrix = new THREE.Matrix4()

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

  const attachments = useAttachmentLoader({ sceneObjects, world })

  const intersectArray = []

  const [isXR, setIsXR] = useState(false)

  const findParent = obj => {
    while (obj) {
      if (!obj.parent || obj.parent.type === 'Scene') {
        return obj
      }
      obj = obj.parent
    }

    return null
  }

  const getModelData = sceneObject => {
    let key = getFilepathForLoadable(sceneObject)
    return attachments[key] && attachments[key].value
  }

  const SceneContent = () => {
    const renderer = useRef(null)
    const xrOffset = useRef(null)

    const { gl, scene, camera, setDefaultCamera } = useThree()
    useRender(() => {
      if (isXR && XRController1 && XRController2) {
        // cleanIntersected()
        // intersectObjects(XRController1, intersectArray)
        // intersectObjects(XRController2, intersectArray)
      }
    })

  const onSelectStart = event => {
    var controller = event.target
    var intersections = getIntersections(controller, intersectArray)
    if (intersections.length > 0) {
      var intersection = intersections[0]
      tempMatrix.getInverse(controller.matrixWorld)
      var object = intersection.object
      object.matrix.premultiply(tempMatrix)
      object.matrix.decompose(object.position, object.quaternion, object.scale)

      var objMaterial = object.material
      if (Array.isArray(objMaterial)) {
        objMaterial.forEach(material => {
          material.emissive.b = 0.25
        })
      } else {
        objMaterial.emissive.b = 0.25
      }

      controller.add(object)
      controller.userData.selected = object
    }
  }

  const onSelectEnd = event => {
    var controller = event.target
    if (controller.userData.selected !== undefined) {
      var object = controller.userData.selected
      object.matrix.premultiply(controller.matrixWorld)
      object.matrix.decompose(object.position, object.quaternion, object.scale)

      var objMaterial = object.material
      if (Array.isArray(objMaterial)) {
        objMaterial.forEach(material => {
          material.emissive.b = 0
        })
      } else {
        objMaterial.emissive.b = 0
      }

      scene.add(object)
      controller.userData.selected = undefined
    }
  }

    useEffect(() => {
      if (!renderer.current) {
        navigator.getVRDisplays().then(displays => {
          if (displays.length) {
            renderer.current = gl
            scene.background = new THREE.Color(world.backgroundColor)
            setIsXR(true)

            if (!XRController1 && !XRController2) {
              document.body.appendChild(WEBVR.createButton(gl))
              gl.vr.enabled = true

              XRController1 = renderer.current.vr.getController(0)
              XRController1.addEventListener('selectstart', onSelectStart)
              XRController1.addEventListener('selectend', onSelectEnd)

              XRController2 = renderer.current.vr.getController(1)
              XRController2.addEventListener('selectstart', onSelectStart)
              XRController2.addEventListener('selectend', onSelectEnd)

              const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])
              const material = new THREE.LineBasicMaterial({
                color: 0x0000ff
              })
              
              const line = new THREE.Line(geometry, material)
              line.name = 'line'
              line.scale.z = 5
              XRController1.add(line.clone())
              XRController2.add(line.clone())
            }
            
            if (xrOffset.current && XRController1) xrOffset.current.add(XRController1)
            if (xrOffset.current && XRController2) xrOffset.current.add(XRController2)

            scene.traverse(child => {
              if (child instanceof THREE.Mesh) {
                if (findParent(child).visible) intersectArray.push(child)
              }
            })
          }
        })
      }
    }, [])

    useEffect(() => {
      if (xrOffset.current && camera.position.y !== xrOffset.current.userData.z) {
        xrOffset.current.position.x = xrOffset.current.userData.x
        xrOffset.current.position.y = xrOffset.current.userData.z - 1.6
        xrOffset.current.position.z = xrOffset.current.userData.y
      }
    })

    return Object.values(sceneObjects).map((sceneObject, i) => {
      switch (sceneObject.type) {
        case 'camera':
          return (
            <group key={i} ref={xrOffset} userData={{x: sceneObject.x, z: sceneObject.z, y: sceneObject.y}}>
              <SGCamera {...{ i, aspectRatio, activeCamera, setDefaultCamera, ...sceneObject }} />
            </group>
          )
        case 'character':
          return <SGCharacter key={i} {...{ modelData: getModelData(sceneObject), ...sceneObject }} />
        case 'object':
          return <SGModel key={i} {...{ modelData: getModelData(sceneObject), ...sceneObject }} />
        case 'light':
          return <SGSpotLight key={i} {...{ ...sceneObject }} />
      }
    }).filter(Boolean)
  }

  return (
    <Canvas>
      <SceneContent />
      <SGWorld {...{
          groundTexture,
          wallTexture,
          world,
          modelData: world.environment.file && getModelData({
            model: world.environment.file,
            type: 'environment'
          })
        }} />
      {
        // <mesh
        //   visible
        //   userData={{ test: 'hello' }}
        //   position={new THREE.Vector3(0, 1.75 / 2, 0)}
        //   rotation={new THREE.Euler(0, 0, 0)}
        //   geometry={new THREE.SphereGeometry(0.5, 16, 16)}
        //   material={
        //     new THREE.MeshStandardMaterial({ color: new THREE.Color('white'), transparent: true, side: THREE.DoubleSide })
        //   }
        // />
      }
    </Canvas>
  )
})

module.exports = SceneManagerXR
