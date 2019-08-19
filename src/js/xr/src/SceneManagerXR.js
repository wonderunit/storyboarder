const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree } = require('react-three-fiber')

const { connect, Provider } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { useMemo, useRef, Suspense } = React = require('react')

const { create } = require('zustand')
const { produce } = require('immer')

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
const teleportParent = require('./helpers/teleport-parent')

const { createSelector } = require('reselect')

// TODO move to selectors if useful
// TODO optimize to only change if top-level keys change
const getSceneObjectCharacterIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'character').map(o => o.id)
)

const [useStore] = create(set => ({
  teleportPos: { x: 0, y: 0, z: 0 },
  teleportRot: { x: 0, y: 0, z: 0 },

  didMoveCamera: null,
  didRotateCamera: null,

  set: fn => set(produce(fn))
}))

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
      // create virtual parent and child
      let parent = new THREE.Object3D()
      parent.position.set(teleportPos.x, teleportPos.y, teleportPos.z)
      parent.rotation.set(teleportRot.x, teleportRot.y, teleportRot.z)

      let child = new THREE.Object3D()
      child.position.copy(camera.position)
      child.rotation.copy(camera.rotation)
      parent.add(child)
      parent.updateMatrixWorld()

      // teleport the virtual parent
      teleportParent(parent, child, x, y, z, r)

      // update state from new position of virtual parent
      set(state => {
        state.teleportPos.x = parent.position.x
        state.teleportPos.y = parent.position.y
        state.teleportPos.z = parent.position.z

        state.teleportRot.x = parent.rotation.x
        state.teleportRot.y = parent.rotation.y
        state.teleportRot.z = parent.rotation.z
      })
    }

    const onAxesChanged = event => {
      onMoveCamera(event)
      onRotateCamera(event)
    }

    const onMoveCamera = event => {
      if (didMoveCamera != null) {
        if (event.axes[1] === 0) {
          set(state => { state.didMoveCamera = null })
        }
      } else {
        if (Math.abs(event.axes[1]) < Math.abs(event.axes[0])) return

        let distance
        let value = event.axes[1]

        // backward
        if (value > 0.075) {
          distance = +1
        }

        // forward
        if (value < -0.075) {
          distance = -1
        }

        if (distance != null) {
          set(state => { state.didMoveCamera = distance })
          moveCamera(distance)
        }
      }
    }

    const onRotateCamera = event => {
      if (didRotateCamera != null) {
        if (event.axes[0] === 0) {
          set(state => { state.didRotateCamera = null })
        }
      } else {
        if (Math.abs(event.axes[0]) < Math.abs(event.axes[1])) return

        // right
        if (event.axes[0] > 0.075) {
          set(state => { state.didRotateCamera = -45 })
          rotateCamera(THREE.Math.degToRad(-45))
        }

        // left
        if (event.axes[0] < -0.075) {
          set(state => { state.didRotateCamera = 45 })
          rotateCamera(THREE.Math.degToRad(45))
        }
      }
    }

    const moveCamera = distance => {
      let center = new THREE.Vector3()
      camera.getWorldPosition(center)
      let gr = camera.rotation.y + teleportRef.current.rotation.y

      let target = new THREE.Vector3(center.x, 0, center.z + distance)
      let d = rotatePoint(target, center, -gr)
      teleport(d.x, null, d.z, null)
    }

    const rotateCamera = radians => {
      let center = new THREE.Vector3()
      camera.getWorldPosition(center)
      let gr = camera.rotation.y + teleportRef.current.rotation.y

      teleport(null, null, null, gr + radians)
    }

    const { gl, camera, scene } = useThree()

    const teleportPos = useStore(state => state.teleportPos)
    const teleportRot = useStore(state => state.teleportRot)
    const didMoveCamera = useStore(state => state.didMoveCamera)
    const didRotateCamera = useStore(state => state.didRotateCamera)
    const set = useStore(state => state.set)

    // initialize behind the camera, on the floor
    useMemo(() => {
      const { x, y, rotation } = sceneObjects[activeCamera]

      const behindCam = {
        x: Math.sin(rotation),
        y: Math.cos(rotation)
      }

      set(state => {
        state.teleportPos.x = x + behindCam.x
        state.teleportPos.y = 0
        state.teleportPos.z = y + behindCam.y

        state.teleportRot.x = 0
        state.teleportRot.y = rotation
        state.teleportRot.z = 0
      })
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
          position={[teleportPos.x, teleportPos.y, teleportPos.z]}
          rotation={[teleportRot.x, teleportRot.y, teleportRot.z]}
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
  const store = useReduxStore()

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
