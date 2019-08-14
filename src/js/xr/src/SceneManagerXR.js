const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { connect, useStore, Provider } = require('react-redux')
const React = require('react')
const { useMemo, useState } = React

const { WEBVR } = require('three/examples/jsm/vr/WebVR')

const {
  getSceneObjects,
  getWorld,
  getActiveCamera
} = require('../../shared/reducers/shot-generator')

const SceneContent = connect(
  state => ({
    sceneObjects: getSceneObjects(state),
    world: getWorld(state),
    activeCamera: getActiveCamera(state)
  })
)(
  ({
    sceneObjects,
    world,
    activeCamera
  }) => {
    const { camera } = useThree()

    const [teleportPos, setTeleportPos] = useState(null)
    const [teleportRot, setTeleportRot] = useState(null)

    // initialize behind the camera, on the floor
    useMemo(() => {
      const { x, y, rotation } = sceneObjects[activeCamera]

      const behindCam = {
        x: Math.sin(rotation),
        y: Math.cos(rotation)
      }

      setTeleportPos(new THREE.Vector3(x + behindCam.x, 0, y + behindCam.y))
      setTeleportRot(new THREE.Euler(0, rotation, 0))
    }, [])

    const groundTexture = useMemo(
      () => new THREE.TextureLoader().load('/data/system/grid_floor.png'), []
    )

    return (
      <>
        <group
          position={teleportPos}
          rotation={teleportRot}
        >
          <primitive object={camera} />
        </group>

        <ambientLight color={0xffffff} intensity={world.ambient.intensity} />

        <mesh
          position={[0, -0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry attach='geometry' args={[135 / 3, 135 / 3, 32]} />
          <meshLambertMaterial attach='material' side={THREE.FrontSide} visible>
            <primitive attach='map' object={groundTexture} />
          </meshLambertMaterial>
        </mesh>
      </>
    )
  })

const XRStartButton = ({ }) => {
  const { gl } = useThree()

  useMemo(
    () => document.body.appendChild(WEBVR.createButton(gl)),
    []
  )

  return null
}

const SceneManagerXR = connect(
  state => ({
    //
  }),
  {
    //
  }
)(
  () => {
    const store = useStore()

    const loaded = true

    return (
      <>
        {
          !loaded && <div className='loading-button'>LOADING …</div>
        }
        <Canvas vr>
          <Provider store={store}>
            {
              loaded && <XRStartButton />
            }
            <SceneContent />
          </Provider>
        </Canvas>
        <div className='scene-overlay' />
      </>
    )
  })

module.exports = SceneManagerXR
