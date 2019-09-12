const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useUpdate } = require('react-three-fiber')

const { connect, Provider, useSelector } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { useMemo, useRef, useState, useEffect } = React = require('react')
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
const useTextureLoader = require('./hooks/use-texture-loader')
const useImageBitmapLoader = require('./hooks/use-texture-loader')

const { useStore, useStoreApi, useInteractionsManager } = require('./use-interactions-manager')
const { useUiManager, UI_ICON_FILEPATHS } = require('./use-ui-manager')

const { useAssetsManager } = require('./hooks/use-assets-manager')
const getFilepathForModelByType = require('./helpers/get-filepath-for-model-by-type')

const Stats = require('./components/Stats')
const Ground = require('./components/Ground')
const Room = require('./components/Room')
const Character = require('./components/Character')
const ModelObject = require('./components/ModelObject')
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
    virtualCameraIds: getSceneObjectVirtualCamerasIds(state)
  }),
  {
    selectObject,
    updateObject
  }
)(
  ({
    aspectRatio, sceneObjects, world, activeCamera, selections, models,

    characterIds, modelObjectIds, virtualCameraIds,

    resources, getAsset
  }) => {
    const { gl, camera, scene } = useThree()

    const teleportRef = useRef()

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

    // values
    const teleportPos = useStore(state => state.teleportPos)
    const teleportRot = useStore(state => state.teleportRot)
    const teleportTargetValid = useStore(state => state.teleportTargetValid)
    const worldScale = useStore(state => state.worldScale)

    useMemo(() => {
      scene.background = new THREE.Color(world.backgroundColor)
      scene.fog = new THREE.Fog(world.backgroundColor, -10, 40)
    }, [world.backgroundColor])

    const rStats = useRStats()

    const groundRef = useRef()
    const rootRef = useRef()

    const { uiService, uiCurrent, getCanvasRenderer } = useUiManager()

    const { controllers, interactionServiceCurrent } = useInteractionsManager({
      groundRef,
      rootRef,
      uiService
    })

    // initialize the BonesHelper
    useMemo(() => {
      const mesh = resources.boneGltf.scene.children.find(child => child.isMesh)
      BonesHelper.getInstance(mesh)
    }, [resources.boneGltf])

    const ambientLightRef = useUpdate(self => {
      self.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER)
    })

    const directionalLightRef = useUpdate(ref => {
      ref.add(ref.target)

      ref.rotation.x = 0
      ref.rotation.z = 0
      ref.rotation.y = world.directional.rotation

      ref.rotateX(world.directional.tilt + Math.PI / 2)

      ref.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER)
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
            <primitive key={controller.uuid} object={controller} >
              <Controller gltf={resources.controllerGltf} />
              {
                navigator.getGamepads()[controller.userData.gamepad.index] &&
                navigator.getGamepads()[controller.userData.gamepad.index].hand === 'right' &&
                <Controls
                  gltf={resources.controlsGltf}
                  mode={uiCurrent.value.controls}
                  getCanvasRenderer={getCanvasRenderer} />
              }
            </primitive>
          )}
        </group>

        <group ref={rootRef} scale={[worldScale, worldScale, worldScale]}>
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
              getAsset(getFilepathForModelByType(sceneObjects[id]))
                ? <Character
                  key={id}
                  gltf={getAsset(getFilepathForModelByType(sceneObjects[id]))}
                  sceneObject={sceneObjects[id]}
                  modelSettings={models[sceneObjects[id].model] || undefined}
                  isSelected={selections.includes(id)} />
                : null
            )
          }

          {
            modelObjectIds.map(id => {
              let sceneObject = sceneObjects[id]

              if (
                // not a box
                sceneObject.model != 'box' &&
                // but the gltf is missing
                getAsset(getFilepathForModelByType(sceneObject)) == null
              ) {
                // return null until it loads
                return null
              }

              let gltf = sceneObject.model != 'box'
                ? getAsset(getFilepathForModelByType(sceneObject))
                : null

              return <ModelObject
                key={id}
                gltf={gltf}
                sceneObject={sceneObject}
                isSelected={selections.includes(id)} />
            })
          }

          {
            virtualCameraIds.map(id =>
              <VirtualCamera
                key={id}
                gltf={resources.virtualCameraGltf}
                aspectRatio={aspectRatio}
                sceneObject={sceneObjects[id]}
                isSelected={selections.includes(id)} />
            )
          }

          {
            world.environment.file &&
            getAsset(getFilepathForModelByType({
              type: 'environment',
              model: world.environment.file
            }))
              ? <Environment
                gltf={getAsset(getFilepathForModelByType({
                  type: 'environment',
                  model: world.environment.file
                }))}
                environment={world.environment}
                visible={world.environment.visible} />
              : null
          }

          <Ground
            objRef={groundRef}
            texture={resources.groundTexture}
            visible={!world.room.visible && world.ground} />

          <Room
            texture={resources.roomTexture}
            width={world.room.width}
            length={world.room.length}
            height={world.room.height}
            visible={world.room.visible} />

          <TeleportTarget
            api={useStoreApi}
            texture={resources.teleportTexture}
            visible={
              interactionServiceCurrent.value.match('drag_teleport') &&
              teleportTargetValid
            }
          />
        </group>
      </>
    )
  })

const XRStartButton = ({ }) => {
  const { gl } = useThree()
  useMemo(() => document.body.appendChild(WEBVR.createButton(gl)), [])
  return null
}

const APP_GLTFS = [
  '/data/system/xr/sgcontroller.glb',
  '/data/system/xr/ui/controls.glb',
  '/data/system/dummies/bone.glb',
  `/data/system/objects/camera.glb`
]

const SceneManagerXR = () => {
  useMemo(() => {
    THREE.Cache.enabled = true
  }, [])

  const store = useReduxStore()

  const [appAssetsLoaded, setAppAssetsLoaded] = useState(false)

  const { assets, requestAsset, getAsset } = useAssetsManager()

  // preload textures
  const groundTexture = useTextureLoader('/data/system/grid_floor_1.png')
  const roomTexture = useTextureLoader('/data/system/grid_wall2.png')
  const teleportTexture = useTextureLoader('/data/system/xr/teleport.png')

  // preload icons
  const uiResources = UI_ICON_FILEPATHS.map(useImageBitmapLoader)

  // preload app gltfs
  useEffect(
    () => APP_GLTFS.forEach(requestAsset),
    []
  )

  // scene
  const sceneObjects = useSelector(getSceneObjects)
  const world = useSelector(getWorld)

  useEffect(() => {
    Object.values(sceneObjects)
      // has a value for model
      .filter(o => o.model != null)
      // is not a box
      .filter(o => !(o.type === 'object' && o.model === 'box'))
      // what's the filepath?
      .map(getFilepathForModelByType)
      // has not been requested
      .filter(filepath => getAsset(filepath) == null)
      // request the file
      .forEach(requestAsset)
  }, [sceneObjects])

  // world model files
  useEffect(() => {
    if (world.environment.file) {
      requestAsset(
        getFilepathForModelByType({
          type: 'environment',
          model: world.environment.file
        })
      )
    }
  }, [world.environment])

  useEffect(() => {
    if (!appAssetsLoaded) {
      let appResources = [groundTexture, roomTexture, teleportTexture]

      // fail if any app resources are missing
      if ([ ...appResources, ...uiResources].some(n => n == null)) return
      if (APP_GLTFS.map(getAsset).some(n => n == null)) return

      setAppAssetsLoaded(true)
    }
  }, [appAssetsLoaded, groundTexture, roomTexture, teleportTexture, uiResources, APP_GLTFS, assets])

  const [isLoading, setIsLoading] = useState(false)
  const [sceneObjectsPreloaded, setSceneObjectsPreloaded] = useState(false)
  useMemo(() => {
    let incomplete = a => a.status !== 'Success' && a.status !== 'Error'
    let remaining = Object.values(assets).filter(incomplete)

    if (isLoading && !sceneObjectsPreloaded && remaining.length === 0) {
      setSceneObjectsPreloaded(true)
      setIsLoading(false)
    } else if (remaining.length > 0) {
      setIsLoading(true)
    }
  }, [assets, sceneObjects, sceneObjectsPreloaded, isLoading])

  const ready = appAssetsLoaded && sceneObjectsPreloaded

  return (
    <>
      {
        !ready && <div className='loading-button'>LOADING …</div>
      }
      <Canvas vr>
        <Provider store={store}>
          {
            ready && <XRStartButton />
          }
          {
            ready
              ? <SceneContent
                resources={{
                  groundTexture,
                  roomTexture,
                  teleportTexture,
                  controllerGltf: getAsset('/data/system/xr/sgcontroller.glb'),
                  controlsGltf: getAsset('/data/system/xr/ui/controls.glb'),
                  boneGltf: getAsset('/data/system/dummies/bone.glb'),
                  virtualCameraGltf: getAsset(`/data/system/objects/camera.glb`)
                }}
                getAsset={getAsset} />
              : null
          }
        </Provider>
      </Canvas>
      <div className='scene-overlay' />
    </>
  )
}

module.exports = SceneManagerXR
