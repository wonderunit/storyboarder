const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useUpdate, useRender } = require('./lib/react-three-fiber')

const { connect } = require('react-redux')
const React = require('react')
const { useEffect, useRef, useMemo, useState, useReducer } = React

const { WEBVR } = require('../../vendor/three/examples/js/vr/WebVR')
require('../../vendor/three/examples/js/loaders/LoaderSupport')
require('../../vendor/three/examples/js/loaders/GLTFLoader')
require('../../vendor/three/examples/js/loaders/OBJLoader2')

const SGWorld = require('./components/SGWorld')
const SGSpotLight = require('./components/SGSpotLight')
const SGCamera = require('./components/SGCamera')
const SGModel = require('./components/SGModel')
const SGCharacter = require('./components/SGCharacter')

const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
objLoader.setLogging(false, false)
THREE.Cache.enabled = true

// window.hackedRequestAnimationFrameTodo = [];
// window.requestAnimationFrame = function(fn) {
//   hackedRequestAnimationFrameTodo.push(fn);
// }


const getFilepathForLoadable = ({ type, model }) => {
  switch (type) {
    case 'character':
      return `/data/system/dummies/gltf/${model}.glb`
    case 'object':
      return `/data/system/objects/${model}.glb`
    default:
      return null
  }
}

const useAttachmentLoader = sceneObjects => {
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
    const loadables = Object.values(sceneObjects)
      // has a value for model
      .filter(o => o.model != null)
      // has not loaded yet
      .filter(o => o.loaded !== true)
      // is not a box
      .filter(o => !(o.type === 'object' && o.model === 'box'))

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

  }),
  {

  }
)(({ aspectRatio, world, sceneObjects, activeCamera }) => {
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

  const attachments = useAttachmentLoader(sceneObjects)
  // Selection Start
  let controller1, controller2
  const raycaster = new THREE.Raycaster()
  const tempMatrix = new THREE.Matrix4()
  const intersected = []
  const intersectArray = [];

  const onSelectStart = () => {
    console.log('start')
  }

  const onSelectEnd = () => {
    console.log('end')
  }

  const getIntersections = controller => {
    tempMatrix.identity().extractRotation(controller.matrixWorld)
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)
    return raycaster.intersectObjects(intersectArray)
  }

  const intersectObjects = controller => {
    if (controller.userData.selected !== undefined) return
    var line = controller.getObjectByName('line')
    var intersections = getIntersections(controller)
    if (intersections.length > 0) {
      var intersection = intersections[0]
      var object = intersection.object
      var objMaterial = object.material

      if (Array.isArray(objMaterial)) {
        objMaterial.forEach(material => {
          material.emissive.g = 0.25
        })
      } else {
        objMaterial.emissive.g = 0.25
      }

      intersected.push(object)
      line.scale.z = intersection.distance
    } else {
      line.scale.z = 5
    }
  }

  const cleanIntersected = () => {
    while (intersected.length) {
      var object = intersected.pop()
      var objMaterial = object.material

      if (Array.isArray(objMaterial)) {
        objMaterial.forEach(material => {
          material.emissive.g = 0
        })
      } else {
        objMaterial.emissive.g = 0
      }
    }
  }
  // Selection End

  const [isXR, setIsXR] = useState(false)

  const SceneContent = () => {
    const renderer = useRef(null)
    const xrOffset = useRef(null)

    const { gl, scene, camera, setDefaultCamera } = useThree()
    useRender(() => {
      if (isXR && controller1 && controller2) {
        cleanIntersected()
        intersectObjects(controller1)
        intersectObjects(controller2)
      }
    })

    useEffect(() => {
      scene.background = new THREE.Color(world.backgroundColor)
      navigator.getVRDisplays().then(displays => {
        if (displays.length) {
          setIsXR(true)
        }
      })

      scene.traverse(child => {
        if (child instanceof THREE.Mesh) {
          intersectArray.push(child)
        }
      })
    }, [])

    useEffect(() => {
      if (!renderer.current) {
        navigator.getVRDisplays().then(displays => {
          if (displays.length) {



            renderer.current = gl

            // let camera = new THREE.PerspectiveCamera( 70, 4 / 3, 0.1, 10 )

            gl.setAnimationLoop(() => {
              // let todo = hackedRequestAnimationFrameTodo;
              // window.hackedRequestAnimationFrameTodo = [];
              // todo.forEach(fn => fn());
              gl.render(scene, camera);
            })



            document.body.appendChild(WEBVR.createButton(gl))
            gl.vr.enabled = true

            // controllers
            controller1 = renderer.current.vr.getController(0)
            controller1.addEventListener('selectstart', onSelectStart)
            controller1.addEventListener('selectend', onSelectEnd)
            if (xrOffset.current) xrOffset.current.add(controller1)

            controller2 = renderer.current.vr.getController(1)
            controller2.addEventListener('selectstart', onSelectStart)
            controller2.addEventListener('selectend', onSelectEnd)
            if (xrOffset.current) xrOffset.current.add(controller2)

            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])
            const material = new THREE.LineBasicMaterial({
              color: 0x0000ff
            })

            const line = new THREE.Line(geometry, material)
            line.name = 'line'
            line.scale.z = 5
            controller1.add(line.clone())
            controller2.add(line.clone())
          }
        })
      }
    })

    const getModelData = sceneObject => {
      let key = getFilepathForLoadable(sceneObject)
      return attachments[key] && attachments[key].value
    }

    return Object.values(sceneObjects).map((sceneObject, i) => {
      switch (sceneObject.type) {
        case 'camera':
          return (
            <group key={i} ref={xrOffset} position={[sceneObject.x, sceneObject.z, sceneObject.y]}>
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
      <SGWorld {...{ groundTexture, wallTexture, world }} />
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
