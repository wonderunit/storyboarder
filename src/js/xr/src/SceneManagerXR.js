const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useUpdate } = require('react-three-fiber')

const { connect, Provider } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { useMemo, useRef, useState, useEffect, Suspense } = React = require('react')

const { WEBVR } = require('three/examples/jsm/vr/WebVR')

const {
  // selectors
  getSceneObjects,
  getWorld,
  getActiveCamera,
  getSelections,

  // action creators
  selectObject,
  updateObject
} = require('../../shared/reducers/shot-generator')

const useRStats = require('./hooks/use-rstats')
const useGltf = require('./hooks/use-gltf')

const { useStore, useStoreApi, useInteractionsManager } = require('./use-interactions-manager')

const Stats = require('./components/Stats')
const Ground = require('./components/Ground')
const Room = require('./components/Room')
const Character = require('./components/Character')
const ModelObject = require('./components/ModelObject')
const Controller = require('./components/Controller')
const TeleportTarget = require('./components/TeleportTarget')
const { Log } = require('./components/Log')

const BonesHelper = require('./three/BonesHelper')

const { createSelector } = require('reselect')

// TODO move to selectors if useful
// TODO optimize to only change if top-level keys change
const getSceneObjectCharacterIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'character').map(o => o.id)
)
const getSceneObjectModelObjectIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'object').map(o => o.id)
)

const SceneContent = connect(
  state => ({
    sceneObjects: getSceneObjects(state),
    world: getWorld(state),
    activeCamera: getActiveCamera(state),
    selections: getSelections(state),

    characterIds: getSceneObjectCharacterIds(state),
    modelObjectIds: getSceneObjectModelObjectIds(state)
  }),
  {
    selectObject,
    updateObject
  }
)(
  ({
    sceneObjects, world, activeCamera, selections,

    characterIds, modelObjectIds
  }) => {
    const { gl, camera, scene } = useThree()

    // values
    const teleportPos = useStore(state => state.teleportPos)
    const teleportRot = useStore(state => state.teleportRot)
    const teleportMode = useStore(state => state.teleportMode)
    const teleportTargetValid = useStore(state => state.teleportTargetValid)

    // actions
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
      scene.background = new THREE.Color(world.backgroundColor)
    }, [world.backgroundColor])

    useMemo(() => {
      scene.fog = new THREE.Fog( 0x000000, -10, 40 )
    }, [])

    const teleportTexture = useMemo(
      () => new THREE.TextureLoader().load('/data/system/xr/teleport.png'), []
    )
    const groundTexture = useMemo(
      () => new THREE.TextureLoader().load('/data/system/grid_floor_1.png'), []
    )

    const rStats = useRStats()

    const teleportRef = useRef()
    const groundRef = useRef()

    const controllers = useInteractionsManager({
      groundRef
    })

    // initialize the BonesHelper
    const boneGltf = useGltf('/data/system/dummies/bone.glb')
    useMemo(() => {
      let mesh = boneGltf.scene.children.filter(child => child.isMesh)[0]
      BonesHelper.getInstance(mesh)
    }, [boneGltf])

    const directionalLightRef = useUpdate(ref => {
      ref.add(ref.target)

      ref.rotation.x = 0
      ref.rotation.z = 0
      ref.rotation.y = world.directional.rotation

      ref.rotateX(world.directional.tilt + Math.PI / 2)
    }, [world.directional.rotation, world.directional.tilt])

    const selectedCharacter = selections.length && sceneObjects[selections[0]].type == 'character'
      ? sceneObjects[selections[0]]
      : null

    return (
      <>
        <group
          ref={teleportRef}
          position={[teleportPos.x, teleportPos.y, teleportPos.z]}
          rotation={[teleportRot.x, teleportRot.y, teleportRot.z]}
        >
          <primitive object={camera}>
            <Stats rStats={rStats} position={[0, 0, -1]} />
            <Log position={[0, -0.15, -1]} />
          </primitive>

          <Suspense fallback={null}>
            <primitive object={gl.vr.getController(0)}>
              <Controller />
            </primitive>
          </Suspense>

          <Suspense fallback={null}>
            <primitive object={gl.vr.getController(1)}>
              <Controller />
            </primitive>
          </Suspense>
        </group>

        <ambientLight color={0xffffff} intensity={world.ambient.intensity} />

        <directionalLight
          ref={directionalLightRef}
          color={0xffffff}
          intensity={world.directional.intensity}
          position={[0, 1.5, 0]}
          target-position={[0, 0, 0.4]}
        />

        {
          characterIds.map(id =>
            <Suspense key={id} fallback={null}>
              <Character
                sceneObject={sceneObjects[id]}
                isSelected={selections.includes(id)} />
            </Suspense>
          )
        }

        {
          modelObjectIds.map(id =>
            <Suspense key={id} fallback={null}>
              <ModelObject
                sceneObject={sceneObjects[id]}
                isSelected={selections.includes(id)} />
            </Suspense>
          )
        }

        <Ground
          objRef={groundRef}
          texture={groundTexture}
          visible={world.room.visible && world.ground} />

        <Room
          width={world.room.width}
          length={world.room.length}
          height={world.room.height}
          visible={world.room.visible} />

        <TeleportTarget
          api={useStoreApi}
          visible={teleportMode && teleportTargetValid}
          texture={teleportTexture}
        />
      </>
    )
  })

const XRStartButton = ({ }) => {
  const { gl } = useThree()
  useMemo(() => document.body.appendChild(WEBVR.createButton(gl)), [])
  return null
}

const Preloader = ({ loaded, setLoaded }) => {
  useEffect(() => {
    setLoaded(false)
    return function cleanup () {
      setLoaded(true)
    }
  }, [])

  return null
}

const SceneManagerXR = () => {
  const store = useReduxStore()

  const [loaded, setLoaded] = useState(false)

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
          <Suspense fallback={<Preloader {...{ loaded, setLoaded }} />}>
            <SceneContent />
          </ Suspense>
        </Provider>
      </Canvas>
      <div className='scene-overlay' />
    </>
  )
}

module.exports = SceneManagerXR
