const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { connect, useStore, Provider } = require('react-redux')
const React = require('react')
const { useMemo, useState } = React

const { WEBVR } = require('three/examples/jsm/vr/WebVR')

const {
  getSceneObjects,
  getActiveCamera
} = require('../../shared/reducers/shot-generator')

const SceneContent = connect(
  state => ({
    sceneObjects: getSceneObjects(state),
    activeCamera: getActiveCamera(state)
  })
)(
({
  sceneObjects,
  activeCamera
}) => {
  const { scene, camera } = useThree()

  const [teleportPos, setTeleportPos] = useState(null)
  const [teleportRot, setTeleportRot] = useState(null)

  // initialize behind the camera, on the floor
  useMemo(() => {
    let { x, y, rotation } = sceneObjects[activeCamera]

    let behindCam = {
      x: Math.sin(rotation),
      y: Math.cos(rotation)
    }

    setTeleportPos(new THREE.Vector3(x + behindCam.x, 0, y + behindCam.y))
    setTeleportRot(new THREE.Euler(0, rotation, 0))
  }, [])

  return (
    <>
      <group
        position={teleportPos}
        rotation={teleportRot}
      >
        <primitive object={camera} />
      </group>

      <ambientLight color={0xffffff} intensity={1} />
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <sphereGeometry attach="geometry" args={[1, 16, 16]} />
        <meshStandardMaterial attach="material" color="indianred" transparent />
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
  ({
    //
  }) => {
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
        <div className="scene-overlay"></div>
      </>
    )
  })

module.exports = SceneManagerXR
