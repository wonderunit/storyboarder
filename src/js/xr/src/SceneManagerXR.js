const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useRender } = require('react-three-fiber')

const { connect, useStore, Provider } = require('react-redux')
const { useMemo, useState, useRef, Suspense } = React = require('react')

const { WEBVR } = require('three/examples/jsm/vr/WebVR')

const {
  getSceneObjects,
  getWorld,
  getActiveCamera
} = require('../../shared/reducers/shot-generator')

const useRStats = require('./hooks/use-rstats')
const useVrControllers = require('./hooks/use-vr-controllers')

const Stats = require('./components/Stats')
const Ground = require('./components/Ground')
const Character = require('./components/Character')
const Controller = require('./components/Controller')

const rotatePoint = require('./helpers/rotate-point')

const { createSelector } = require('reselect')

// TODO move to selectors if useful
// TODO optimize to only change if top-level keys change
const getSceneObjectCharacterIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'character').map(o => o.id)
)

const SceneContent = connect(
  state => ({
    sceneObjects: getSceneObjects(state),
    world: getWorld(state),
    activeCamera: getActiveCamera(state),

    characterIds: getSceneObjectCharacterIds(state)
  })
)(
  ({
    sceneObjects, world, activeCamera,
    characterIds
  }) => {
    const teleport = (x, y, z, r) => {
      // create virtual objects
      let parent = new THREE.Object3D()
      parent.position.copy(teleportRef.current.position)
      parent.rotation.copy(teleportRef.current.rotation)
      let child = new THREE.Object3D()
      child.position.copy(camera.position)
      child.rotation.copy(camera.rotation)
      parent.add(child)
      parent.updateMatrixWorld()

      // if x and y both present
      if (x != null && z != null) {
        let center = new THREE.Vector3()
        child.getWorldPosition(center)

        let dx = parent.position.x - center.x
        let dz = parent.position.z - center.z

        parent.position.x = x + dx
        parent.position.z = z + dz
        parent.updateMatrixWorld()
      }

      // reset y unless given explicit value
      if (y != null) {
        parent.position.y = 0
      }

      if (r != null) {
        let center = new THREE.Vector3()
        child.getWorldPosition(center)

        let gr = child.rotation.y + parent.rotation.y

        let dr = gr - r

        let v = rotatePoint(parent.position, center, dr)

        parent.position.x = v.x
        parent.position.z = v.z
        parent.rotation.y = r - child.rotation.y
      }

      // update state from new position of virtual objects
      setTeleportPos(parent.position)
      setTeleportRot(parent.rotation)
    }

    const onAxesChanged = event => {
      moveCamera(event)
      rotateCamera(event)
    }

    const moveCamera = event => {
      if (event.axes[1] === 0) {
        moveCamRef.current = null
      }

      if (moveCamRef.current) return
      if (Math.abs(event.axes[1]) < Math.abs(event.axes[0])) return

      let center = new THREE.Vector3()
      camera.getWorldPosition(center)
      let gr = camera.rotation.y + teleportRef.current.rotation.y

      if (event.axes[1] > 0.075) {
        moveCamRef.current = 'Backwards'

        let target = new THREE.Vector3(center.x, 0, center.z + 1)
        let d = rotatePoint(target, center, -gr)
        teleport(d.x, null, d.z, null)
      }

      if (event.axes[1] < -0.075) {
        moveCamRef.current = 'Forwards'

        let target = new THREE.Vector3(center.x, 0, center.z - 1)
        let d = rotatePoint(target, center, -gr)
        teleport(d.x, null, d.z, null)
      }
    }

    const rotateCamera = event => {
      if (event.axes[0] === 0) {
        rotateCamRef.current = null
      }

      if (rotateCamRef.current) return
      if (Math.abs(event.axes[0]) < Math.abs(event.axes[1])) return

      let center = new THREE.Vector3()
      camera.getWorldPosition(center)
      let gr = camera.rotation.y + teleportRef.current.rotation.y

      if (event.axes[0] > 0.075) {
        rotateCamRef.current = 'Right'
        teleport(null, null, null, gr + THREE.Math.degToRad(-45))
      }

      if (event.axes[0] < -0.075) {
        rotateCamRef.current = 'Left'
        teleport(null, null, null, gr + THREE.Math.degToRad(45))
      }
    }

    const { gl, camera, scene } = useThree()

    const [teleportPos, setTeleportPos] = useState(null)
    const [teleportRot, setTeleportRot] = useState(null)

    const moveCamRef = useRef()
    const rotateCamRef = useRef()

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

    useMemo(() => {
      scene.background = new THREE.Color(0x000000)
      scene.fog = new THREE.Fog( 0x000000, -10, 40 )
    })

    const groundTexture = useMemo(
      () => new THREE.TextureLoader().load('/data/system/grid_floor_1.png'), []
    )

    const rStats = useRStats()

    const teleportRef = useRef()

    // controller objects via THREE.WebVRManager
    const controllerObjects = useMemo(
      () => [gl.vr.getController(0), gl.vr.getController(1)],
      []
    )

    // controller state via THREE.VRController
    const controllers = useVrControllers({
      // onSelectStart,
      // onSelectEnd,
      // onGripDown,
      // onGripUp,
      onAxesChanged
    })
    const controllerLeft = useMemo(() => controllers.find(c => c.getHandedness() === 'left'), [controllers])
    const controllerRight = useMemo(() => controllers.find(c => c.getHandedness() === 'right'), [controllers])

    return (
      <>
        <group
          ref={teleportRef}
          position={teleportPos}
          rotation={teleportRot}
        >
          <primitive object={camera}>
            <Stats rStats={rStats} position={[0, 0, -1]} />
          </primitive>

          <Suspense fallback={null}>
            <primitive object={controllerObjects[0]}>
              <Controller />
            </primitive>
          </Suspense>

          <Suspense fallback={null}>
            <primitive object={controllerObjects[1]}>
              <Controller />
            </primitive>
          </Suspense>
        </group>

        <ambientLight color={0xffffff} intensity={world.ambient.intensity} />

        <directionalLight
          ref={ref => {
            if (ref) {
              ref.add(ref.target)

              ref.rotation.x = 0
              ref.rotation.z = 0
              ref.rotation.y = world.directional.rotation

              ref.rotateX(world.directional.tilt + Math.PI / 2)
            }
          }}
          color={0xffffff}
          intensity={world.directional.intensity}
          position={[0, 1.5, 0]}
          target-position={[0, 0, 0.4]}
        />

        {
          characterIds.map(id =>
            <Suspense key={id} fallback={null}>
              <Character sceneObject={sceneObjects[id]} />
            </Suspense>
          )
        }

        <Ground texture={groundTexture} visible={true/*!world.room.visible && world.ground*/} />
      </>
    )
  })

const XRStartButton = ({ }) => {
  const { gl } = useThree()
  useMemo(() => document.body.appendChild(WEBVR.createButton(gl)), [])
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
