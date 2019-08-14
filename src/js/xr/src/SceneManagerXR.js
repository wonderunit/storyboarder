const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useRender } = require('react-three-fiber')

const { connect, useStore, Provider } = require('react-redux')
const { useMemo, useState, useEffect, useRef } = React = require('react')

const { WEBVR } = require('three/examples/jsm/vr/WebVR')

const {
  getSceneObjects,
  getWorld,
  getActiveCamera
} = require('../../shared/reducers/shot-generator')

const useRStats = require('./hooks/use-rstats')
const FPSMeter = require('./components/FPSMeter')

const SDFText = require('datguivr/modules/datguivr/sdftext')
const textCreator = SDFText.creator()

const HUD = ({ position, children }) => {
  return (
    <group position={position}>
      {children}
    </group>
  )
}

require('../vendor/VRController')
const useVrControllers = () => {
  const { gl } = useThree()
  const [list, setList] = useState([])

  useRender(() => {
    THREE.VRController.update()
  })

  const onVRControllerConnected = event => {
    let controller = event.detail
    controller.standingMatrix = gl.vr.getStandingMatrix()
    setList(THREE.VRController.controllers)
  }

  const onVRControllerDisconnected = event => {
    let controller = event.detail
    setList(THREE.VRController.controllers)
  }

  useEffect(() => {
    window.addEventListener('vr controller connected', onVRControllerConnected)
    window.addEventListener('vr controller disconnected', onVRControllerDisconnected)
    return () => {
      window.removeEventListener('vr controller connected', onVRControllerConnected)
      window.removeEventListener('vr controller disconnected', onVRControllerDisconnected)
    }
  }, [])

  return list
}

const SimpleText = ({
  label,
  textProps = {
    color: 0xffffff,
    scale: 1,
    centerText: false
  },
  ...props
}) => {
  const group = useRef(null)

  useMemo(() => {
    if (group.current) {
      // changed in dataguivr 0.1.6
      group.current.update(label.toString())
    } else {
      group.current = textCreator.create(
        label.toString(),
        textProps
      )
    }
  }, [label])

  return <primitive {...props} object={group.current} />
}

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

    const rStats = useRStats()
    const controllers = useVrControllers()
    const controllerLeft = useMemo(() => controllers.find(c => c.getHandedness() === 'left'), [controllers])
    const controllerRight = useMemo(() => controllers.find(c => c.getHandedness() === 'right'), [controllers])

    const groupRef = useRef()

    useMemo(() => {
      if (groupRef.current) {
        let material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
        let geometry = new THREE.BoxBufferGeometry(1, 1, 1)

        for (let i = 0; i < 500; i++) {
          let n = i
          let x = (Math.random() * 2 - 1) * 45 / 2
          let z = (Math.random() * 2 - 1) * 45 / 2

          let child = new THREE.Mesh(geometry, material)

          child.matrixAutoUpdate = false

          child.position.x = x
          child.position.y = 0.5
          child.position.z = z
          child.updateMatrix()

          groupRef.current.add(child)

        }
        console.log('added 500 objects')
      }
    }, [groupRef.current])

    return (
      <>
        <group
          position={teleportPos}
          rotation={teleportRot}
        >
          <primitive object={camera}>
            <HUD position={[0, 0, -1]}>
              <FPSMeter rStats={rStats} textCreator={textCreator} position={[0.3, 0.05, 0]} />

              <SimpleText label={`left: ${controllerLeft && controllerLeft.uuid.substr(0, 7)}`} position={[-0.3, 0.05, 0]} />
              <SimpleText label={`right: ${controllerRight && controllerRight.uuid.substr(0, 7)}`} position={[-0.3, 0, 0]} />
            </HUD>
          </primitive>
        </group>

        <ambientLight color={0xffffff} intensity={1 /*world.ambient.intensity*/} />

        <group ref={groupRef}></group>

        {/* {
          boxes.map(box =>
            <mesh key={box.n} position={[box.x, 0, box.z]} rotation={[0, 0, 0]} matrixAutoUpdate={false}>
              <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
              <meshStandardMaterial attach="material" color={0xff0000} />
            </mesh>
          )
        } */}

        <mesh
          // slightly offset to allow for outlines
          position={[0, -0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeBufferGeometry attach='geometry' args={[45, 45]} />
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

const SceneManagerXR = () => {
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
}

module.exports = SceneManagerXR
