const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useUpdate } = require('react-three-fiber')

const { connect } = require('react-redux')
const React = require('react')
const { useEffect, useRef, useMemo, useState } = React

const { WEBVR } = require('../../vendor/three/examples/js/vr/WebVR')
require('../../vendor/three/examples/js/loaders/LoaderSupport')
require('../../vendor/three/examples/js/loaders/GLTFLoader')
require('../../vendor/three/examples/js/loaders/OBJLoader2')

const SGWorld = require('./components/SGWorld')
const SGSpotLight = require('./components/SGSpotLight')
const SGCamera = require('./components/SGCamera')

const SGCharacter = ({ i, aspectRatio, activeCamera, setDefaultCamera, modelData, ...props }) => {

  const mesh = useMemo(() =>
    modelData &&
    (
      modelData.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
      modelData.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)
    ),
    [modelData]
  )

  return mesh
    ? <mesh
      visible
      key={i}
      userData={{ id: props.id }}
      position={[ props.x, props.z, props.y ]}
      rotation={new THREE.Euler(0, 0, 0)}
      geometry={new THREE.SphereGeometry(0.5, 16, 16)}
      material={
        new THREE.MeshStandardMaterial({
          color: new THREE.Color('red'),
          transparent: true,
          side: THREE.DoubleSide
        })
      }
    />
  : null
}

const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
objLoader.setLogging(false, false)
THREE.Cache.enabled = true

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

  const [modelData, setModelData] = useState()
  useMemo(() =>
    gltfLoader.load(
      '/data/system/dummies/gltf/adult-male.glb',
      value => {
        console.log('loaded!', value)
        setModelData(value)
      },
      null,
      error => {
        console.error(error)
      }
    ),
    []
  )

  const SGModel = ({}) => {
    return null
  }

  const SceneContent = () => {
    const renderer = useRef(null)
    const xrOffset = useRef(null)

    const { gl, scene, setDefaultCamera } = useThree()

    useEffect(() => {
      if (!renderer.current) {
        navigator.getVRDisplays().then(displays => {
          if (displays.length) {
            renderer.current = gl

            document.body.appendChild(WEBVR.createButton(gl))
            gl.vr.enabled = true

            // controllers
            controller1 = renderer.current.vr.getController(0)
            xrOffset.current.add(controller1)

            controller2 = renderer.current.vr.getController(1)
            xrOffset.current.add(controller2)

            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])

            const line = new THREE.Line(geometry)
            line.name = 'line'
            line.scale.z = 5
            controller1.add(line.clone())
            controller2.add(line.clone())
          }
        })
      }
    })

    return Object.values(sceneObjects).map((props, i) => {
      switch (props.type) {
        case 'camera':
          return (
            <group key={i} ref={xrOffset} position={[props.x, props.z, props.y]}>
              <SGCamera {...{ i, aspectRatio, activeCamera, setDefaultCamera, ...props }} />
            </group>
          )
        case 'character':
          return <SGCharacter key={i} {...{ modelData, ...props }} />
        case 'light':
          return <SGSpotLight key={i} {...{ ...props }} />
      }
    }).filter(Boolean)

    return components
  }

  return (
    <Canvas style={{ background: `#${new THREE.Color(world.backgroundColor).getHexString()}` }}>
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
