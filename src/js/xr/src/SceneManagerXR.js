const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useUpdate, useRender } = require('react-three-fiber')

const { connect, Provider } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { useMemo, useRef, useState, useEffect, Suspense } = React = require('react')
require('./three/GPUPickers/utils/Object3dExtension')
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
const useTextureLoader = require('./hooks/use-texture-loader')

const { useStore, useStoreApi, useInteractionsManager } = require('./use-interactions-manager')
const { useUiManager } = require('./use-ui-manager')

const Stats = require('./components/Stats')
const Ground = require('./components/Ground')
const Room = require('./components/Room')
const Character = require('./components/Character')
const ModelObject = require('./components/ModelObject')
const Light = require('./components/Light')
const VirtualCamera = require('./components/VirtualCamera')
const Environment = require('./components/Environment')
const Controller = require('./components/Controller')
const TeleportTarget = require('./components/TeleportTarget')
const { Log } = require('./components/Log')

const Controls = require('./components/ui/Controls')

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

const getSceneObjectLightIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'light').map(o => o.id)
)

const getSceneObjectVirtualCamerasIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'camera').map(o => o.id)
)

const SceneContent = connect(
  state => ({
    aspectRatio: state.aspectRatio,
    sceneObjects: getSceneObjects(state),
    world: getWorld(state),
    activeCamera: getActiveCamera(state),
    selections: getSelections(state),
    models: state.models,

    characterIds: getSceneObjectCharacterIds(state),
    modelObjectIds: getSceneObjectModelObjectIds(state),
    lightIds: getSceneObjectLightIds(state),
    virtualCameraIds: getSceneObjectVirtualCamerasIds(state),
  }),
  {
    selectObject,
    updateObject
  }
)(
  ({
    aspectRatio, sceneObjects, world, activeCamera, selections, models,

    characterIds, modelObjectIds, lightIds, virtualCameraIds
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
      scene.fog = new THREE.Fog(world.backgroundColor, -10, 40)
    }, [world.backgroundColor])

    const teleportTexture = useTextureLoader('/data/system/xr/teleport.png')
    const groundTexture = useTextureLoader('/data/system/grid_floor_1.png')

    const rStats = useRStats()

    const teleportRef = useRef()
    const groundRef = useUpdate(
      self => {
        self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
      }
    )

    const { uiService, uiCurrent, getCanvasRenderer } = useUiManager()

    const controllers = useInteractionsManager({
      groundRef,
      uiService
    })

    // initialize the BonesHelper
    const boneGltf = useGltf('/data/system/dummies/bone.glb')
    useMemo(() => {
      const mesh = boneGltf.scene.children.find(child => child.isMesh)
      BonesHelper.getInstance(mesh)
    }, [boneGltf])

    const ambientLightRef = useUpdate(self => {
      self.layers.set(VirtualCamera.VIRTUAL_CAMERA_LAYER)
    })

    const directionalLightRef = useUpdate(ref => {
      ref.add(ref.target)

      ref.rotation.x = 0
      ref.rotation.z = 0
      ref.rotation.y = world.directional.rotation

      ref.rotateX(world.directional.tilt + Math.PI / 2)

      ref.layers.set(VirtualCamera.VIRTUAL_CAMERA_LAYER)
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

          {controllers.filter(Boolean).map(controller =>
            <Suspense key={controller.uuid} fallback={null}>
              <primitive object={controller} >
                <Controller />

                {
                  navigator.getGamepads()[controller.userData.gamepad.index] &&
                  navigator.getGamepads()[controller.userData.gamepad.index].hand === 'right' &&
                  <Suspense fallback={null}>
                    <Controls
                      mode={uiCurrent.value.controls}
                      getCanvasRenderer={getCanvasRenderer} />
                  </Suspense>
                }
              </primitive>
            </Suspense>
          )}
        </group>

        <ambientLight
          ref={ambientLightRef}
          color={0xffffff}
          intensity={world.ambient.intensity} />

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
                modelSettings={models[sceneObjects[id].model] || undefined}
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
        {
          lightIds.map(id =>
            <Suspense key={id} fallback={null}>
              <Light
                sceneObject={sceneObjects[id]}
                isSelected={selections.includes(id)}
                texture={teleportTexture} />
              {/* TODO sound beam when selected */}
            </Suspense>
          )
        }
        {
          virtualCameraIds.map(id =>
            <Suspense key={id} fallback={null}>
              <VirtualCamera
                aspectRatio={aspectRatio}
                sceneObject={sceneObjects[id]}
                isSelected={selections.includes(id)} />
            </Suspense>)
        }

        {
          world.environment.file &&
            <Environment
              environment={world.environment}
              visible={world.environment.visible} />
        }

        <Ground
          objRef={groundRef}
          texture={groundTexture}
          visible={!world.room.visible && world.ground} />

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

  useMemo(() => {
    THREE.Cache.enabled = true
  }, [])

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
          </Suspense>
        </Provider>
      </Canvas>
      <div className='scene-overlay' />
    </>
  )
}

module.exports = SceneManagerXR
