const SHOW_STATS = false
const SHOW_LOG = false

const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useUpdate } = require('react-three-fiber')

const { connect, Provider, useSelector } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { useMemo, useRef, useState, useEffect, useCallback } = React = require('react')
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
const useIsVrPresenting = require('./hooks/use-is-vr-presenting')
const useTextureLoader = require('./hooks/use-texture-loader')
const useImageBitmapLoader = require('./hooks/use-texture-loader')
const useAudioLoader = require('./hooks/use-audio-loader')

const { WORLD_SCALE_LARGE, WORLD_SCALE_SMALL, useStore, useStoreApi, useInteractionsManager } = require('./use-interactions-manager')
const { useUiStore, useUiManager, UI_ICON_FILEPATHS } = require('./hooks/ui-manager')

const { useAssetsManager } = require('./hooks/use-assets-manager')
const getFilepathForModelByType = require('./helpers/get-filepath-for-model-by-type')

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
const SimpleErrorBoundary = require('./components/SimpleErrorBoundary')

const Controls = require('./components/ui/Controls')
const Help = require('./components/ui/Help')

const BonesHelper = require('./three/BonesHelper')
const Voicer = require('./three/Voicer')

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

    characterIds, modelObjectIds, lightIds, virtualCameraIds,

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
    const worldScale = useStore(state => state.worldScale)

    const switchHand = useUiStore(state => state.switchHand)
    const showCameras = useUiStore(state => state.showCameras)
    const showHelp = useUiStore(state => state.showHelp)

    const fog = useRef()
    const getFog = () => {
      if (!fog.current) {
        fog.current = new THREE.Fog(world.backgroundColor, -10, world.fog.far)
      }
      return fog.current
    }

    useMemo(() => {
      scene.background = new THREE.Color(world.backgroundColor)

      getFog().backgroundColor = world.backgroundColor
      getFog().far = world.fog.far
      scene.fog = world.fog.visible
        ? getFog()
        : null
    }, [world.backgroundColor, world.fog.visible, world.fog.far])

    let statsComponent = null
    if (SHOW_STATS) {
      const rStats = useRStats()
      statsComponent = (
        <Stats rStats={rStats} position={[0, 0, -1]} />
      )
    }
    let logComponent = null
    if (SHOW_LOG) {
      logComponent = <Log position={[0, -0.15, -1]} />
    }

    const [cameraAudioListener] = useState(() => new THREE.AudioListener())
    const [atmosphereAudioFilter] = useState(() => {
      const audioContext = THREE.AudioContext.getContext()
      let biquadFilter = audioContext.createBiquadFilter()
      biquadFilter.type = 'highpass'
      biquadFilter.frequency.value = 0
      return biquadFilter
    })
    useEffect(() => {
      // atmosphere sound highpass filter on/off
      const audioContext = THREE.AudioContext.getContext()
      if (worldScale === WORLD_SCALE_LARGE) {
        atmosphereAudioFilter.frequency.setTargetAtTime(0, audioContext.currentTime, 0.04)
      } else {
        atmosphereAudioFilter.frequency.setTargetAtTime(400, audioContext.currentTime, 0.04)
      }

      // all sounds get a little quieter
      cameraAudioListener.gain.gain.setTargetAtTime(
        worldScale === WORLD_SCALE_LARGE
          ? 1
          : 0.4,
        audioContext.currentTime,
        0.04
      )
    }, [worldScale])
    const welcomeAudio = useMemo(() => {
      const audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.welcomeAudioBuffer)
      audio.setLoop(false)
      audio.setVolume(0.35)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const atmosphereAudio = useMemo(() => {
      const audio = new THREE.PositionalAudio(cameraAudioListener)
      audio.setBuffer(resources.atmosphereAudioBuffer)
      audio.setFilter(atmosphereAudioFilter)
      audio.setLoop(true)
      audio.setVolume(0.3)
      audio.play()
      audio.stop()
      // audio.add(new THREE.PositionalAudioHelper(audio))
      return audio
    }, [])
    const beamVoicer = useMemo(() => {
      let voicer = new Voicer(cameraAudioListener, 6, resources.beamAudioBuffer, {
        releaseTime: 0.05
      })
      voicer.setVolume(1)
      return voicer
    }, [])
    const teleportAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.teleportAudioBuffer)
      audio.setLoop(false)
      audio.setVolume(1)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const selectAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.selectAudioBuffer)
      audio.setLoop(false)
      audio.setVolume(0.5)
      audio.play()
      audio.stop()
      return audio
    }, [])

    const undoAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.undoBuffer)
      audio.setLoop(false)
      audio.setVolume(1)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const redoAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.redoBuffer)
      audio.setLoop(false)
      audio.setVolume(1)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const boneHoverVoicer = useMemo(() => {
      let voicer = new Voicer(cameraAudioListener, 8, resources.boneHoverBuffer)
      voicer.setVolume(1)
      return voicer
    }, [])
    const boneDroneVoicer = useMemo(() => {
      let voicer = new Voicer(cameraAudioListener, 8, resources.boneDroneBuffer, {
        releaseTime: 0.2
      })
      voicer.setVolume(0.6)
      return voicer
    }, [])
    const fastSwooshAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.fastSwooshBuffer)
      audio.setLoop(false)
      audio.setVolume(0.1)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const dropAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.dropBuffer)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const uiCreateAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.uiCreateBuffer)
      audio.setLoop(false)
      audio.setVolume(1)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const uiDeleteAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.uiDeleteBuffer)
      audio.setLoop(false)
      audio.setVolume(1)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const helpVoicer = useMemo(() => {
      let voicer = new Voicer(cameraAudioListener, 10, null, {
        releaseTime: 0.2
      })
      voicer.setVolume(1)
      return voicer
    }, [])

    const isVrPresenting = useIsVrPresenting()
    useEffect(() => {
      if (isVrPresenting) {
        welcomeAudio.play()
        if (!atmosphereAudio.isPlaying) atmosphereAudio.play()
      } else {
        welcomeAudio.isPlaying && welcomeAudio.stop()
      }
    }, [isVrPresenting])


    const playSound = useCallback((name, object3d = null) => {
      switch (name) {
        case 'beam':
          beamVoicer.noteOn(object3d)
          break
        case 'bone-drone':
          boneDroneVoicer.noteOn(object3d)
          break
        case 'select':
        case 'bone-click':
          selectAudio.stop()
          selectAudio.play()
          break
        case 'teleport':
          teleportAudio.stop()
          teleportAudio.play()
          break
        case 'teleport-move':
        case 'teleport-rotate':
          fastSwooshAudio.stop()
          fastSwooshAudio.play()
          break
        case 'drop':
          dropAudio.stop()
          dropAudio.play()
          break
        case 'bone-hover':
          boneHoverVoicer.noteOn()
          break
        case 'undo':
          undoAudio.stop()
          undoAudio.play()
          break
        case 'redo':
          redoAudio.stop()
          redoAudio.play()
        case 'create':
          uiCreateAudio.stop()
          uiCreateAudio.play()
          break
        case 'delete':
          uiDeleteAudio.stop()
          uiDeleteAudio.play()
          break

        case 'help1':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp1 })
          break
        case 'help2':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp2 })
          break
        case 'help3':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp3 })
          break
        case 'help4':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp4 })
          break
        case 'help5':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp5 })
          break
        case 'help6':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp6 })
          break
        case 'help7':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp7 })
          break
        case 'help8':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp8 })
          break
        case 'help9':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp9 })
          break
        case 'help10':
          helpVoicer.allNotesOff()
          helpVoicer.noteOn(null, { buffer: resources.vrHelp10 })
          break
      }
    }, [])

    const stopSound = useCallback((name, object3d = null) => {
      switch (name) {
        case 'beam':
          beamVoicer.allNotesOff()
          break
        case 'bone-drone':
          boneDroneVoicer.allNotesOff()
          break

        case 'help':
        case 'help1':
        case 'help2':
        case 'help3':
        case 'help4':
        case 'help5':
        case 'help6':
        case 'help7':
        case 'help8':
        case 'help9':
        case 'help10':
          helpVoicer.allNotesOff()
          break
      }
    }, [])

    const groundRef = useRef()
    const rootRef = useRef()

    const { uiService, uiCurrent, getCanvasRenderer } = useUiManager({ playSound, stopSound })

    const { controllers, interactionServiceCurrent } = useInteractionsManager({
      groundRef,
      rootRef,
      uiService,
      playSound,
      stopSound
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

    const gamepads = navigator.getGamepads()
    const gamepadFor = controller => gamepads[controller.userData.gamepad.index]

    return (
      <>
        <group
          ref={teleportRef}
          position={[teleportPos.x, teleportPos.y, teleportPos.z]}
          rotation={[teleportRot.x, teleportRot.y, teleportRot.z]}
        >
          <primitive object={camera}>
            {statsComponent}
            {logComponent}
            <primitive object={cameraAudioListener} />
          </primitive>

          {controllers.filter(gamepadFor).map(controller =>
            <primitive key={controller.uuid} object={controller} >
              <Controller
                gltf={resources.controllerGltf}
                hand={gamepadFor(controller).hand}
              />
              {gamepadFor(controller).hand === (switchHand ? 'left' : 'right') &&
                <group>
                  <Controls
                    gltf={resources.controlsGltf}
                    mode={uiCurrent.value.controls}
                    hand={switchHand ? 'left' : 'right'}
                    getCanvasRenderer={getCanvasRenderer} />
                    { showHelp && <Help
                      mode={uiCurrent.value.controls}
                      getCanvasRenderer={getCanvasRenderer} />
                    }
                </group>
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
                ? <SimpleErrorBoundary key={id}>
                  <Character
                    key={id}
                    gltf={getAsset(getFilepathForModelByType(sceneObjects[id]))}
                    sceneObject={sceneObjects[id]}
                    modelSettings={models[sceneObjects[id].model] || undefined}
                    isSelected={selections.includes(id)} />
                </SimpleErrorBoundary>
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

              return <SimpleErrorBoundary key={id}>
                <ModelObject
                  key={id}
                  gltf={gltf}
                  sceneObject={sceneObject}
                  isSelected={selections.includes(id)} />
              </SimpleErrorBoundary>
            })
          }

          {
            lightIds.map(id =>
              <Light
                key={id}
                gltf={resources.lightGltf}
                sceneObject={sceneObjects[id]}
                isSelected={selections.includes(id)}
                worldScale={worldScale} />
            )
          }
          {
            showCameras && virtualCameraIds.map(id =>
              <VirtualCamera
                key={id}
                gltf={resources.virtualCameraGltf}
                aspectRatio={aspectRatio}
                sceneObject={sceneObjects[id]}
                isSelected={selections.includes(id)}
                isActive={activeCamera === id}
                audio={
                  activeCamera === id
                    ? atmosphereAudio
                    : null
                }
              />
            )
          }

          {
            world.environment.file &&
            getAsset(getFilepathForModelByType({
              type: 'environment',
              model: world.environment.file
            }))
              ? <SimpleErrorBoundary>
                <Environment
                  gltf={getAsset(getFilepathForModelByType({
                    type: 'environment',
                    model: world.environment.file
                  }))}
                  environment={world.environment}
                  visible={world.environment.visible} />
              </SimpleErrorBoundary>
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
            gltf={resources.teleportTargetGltf}
            isDragging={interactionServiceCurrent.value.match('drag_teleport')}
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
  '/data/system/xr/controller.glb',
  '/data/system/xr/ui/controls.glb',
  '/data/system/dummies/bone.glb',
  '/data/system/xr/virtual-camera.glb',
  '/data/system/xr/light.glb',
  '/data/system/xr/teleport-target.glb'
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

  // preload icons
  const uiResources = UI_ICON_FILEPATHS.map(useImageBitmapLoader)

  // preload app gltfs
  useEffect(
    () => APP_GLTFS.forEach(requestAsset),
    []
  )

  // preload audio
  const welcomeAudioBuffer = useAudioLoader('/data/system/xr/snd/vr-welcome.ogg')
  const atmosphereAudioBuffer = useAudioLoader('/data/system/xr/snd/vr-drone.ogg')
  const selectAudioBuffer = useAudioLoader('/data/system/xr/snd/vr-select.ogg')
  const beamAudioBuffer = useAudioLoader('/data/system/xr/snd/vr-drag-drone.ogg')
  const teleportAudioBuffer = useAudioLoader('/data/system/xr/snd/vr-teleport.ogg')

  const undoBuffer = useAudioLoader('/data/system/xr/snd/vr-ui-undo.ogg')
  const redoBuffer = useAudioLoader('/data/system/xr/snd/vr-ui-redo.ogg')
  const boneHoverBuffer = useAudioLoader('/data/system/xr/snd/vr-bone-hover.ogg')
  const boneDroneBuffer = useAudioLoader('/data/system/xr/snd/vr-bone-drone.ogg')
  const fastSwooshBuffer = useAudioLoader('/data/system/xr/snd/vr-fast-swoosh.ogg')
  const dropBuffer = useAudioLoader('/data/system/xr/snd/vr-drop.ogg')
  const uiCreateBuffer = useAudioLoader('/data/system/xr/snd/vr-ui-create.ogg')
  const uiDeleteBuffer = useAudioLoader('/data/system/xr/snd/vr-ui-delete.ogg')

  const vrHelp1 = useAudioLoader('/data/system/xr/snd/vr-help-1.ogg')
  const vrHelp2 = useAudioLoader('/data/system/xr/snd/vr-help-2.ogg')
  const vrHelp3 = useAudioLoader('/data/system/xr/snd/vr-help-3.ogg')
  const vrHelp4 = useAudioLoader('/data/system/xr/snd/vr-help-4.ogg')
  const vrHelp5 = useAudioLoader('/data/system/xr/snd/vr-help-5.ogg')
  const vrHelp6 = useAudioLoader('/data/system/xr/snd/vr-help-6.ogg')
  const vrHelp7 = useAudioLoader('/data/system/xr/snd/vr-help-7.ogg')
  const vrHelp8 = useAudioLoader('/data/system/xr/snd/vr-help-8.ogg')
  const vrHelp9 = useAudioLoader('/data/system/xr/snd/vr-help-9.ogg')
  const vrHelp10 = useAudioLoader('/data/system/xr/snd/vr-help-10.ogg')

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
      let appResources = [groundTexture, roomTexture]
      let soundResources = [
        welcomeAudioBuffer, atmosphereAudioBuffer, selectAudioBuffer, beamAudioBuffer,
        teleportAudioBuffer,
        undoBuffer, redoBuffer, boneHoverBuffer, boneDroneBuffer, fastSwooshBuffer, dropBuffer,
        uiCreateBuffer, uiDeleteBuffer,
        vrHelp1, vrHelp2, vrHelp3, vrHelp4, vrHelp5, vrHelp6, vrHelp7, vrHelp8, vrHelp9, vrHelp10
      ]

      // fail if any app resources are missing
      if ([...appResources, ...soundResources, ...uiResources].some(n => n == null)) return
      if (APP_GLTFS.map(getAsset).some(n => n == null)) return

      setAppAssetsLoaded(true)
    }
  }, [appAssetsLoaded, groundTexture, roomTexture, uiResources, APP_GLTFS, assets])

  const [isLoading, setIsLoading] = useState(false)
  const [sceneObjectsPreloaded, setSceneObjectsPreloaded] = useState(false)
  useMemo(() => {
    let incomplete = a => a.status !== 'Success' && a.status !== 'Error'
    let remaining = Object.values(assets).filter(incomplete)

    if (isLoading && !sceneObjectsPreloaded && remaining.length === 0) {
      setSceneObjectsPreloaded(true)
      setIsLoading(false)

      let assetsWithErrors = Object.entries(assets).reduce((arr, [key, asset]) => {
        if (asset.status == 'Error') {
          arr[key] = asset
        }
        return arr
      }, {})
      Object.entries(assetsWithErrors).forEach(([uri, asset]) => {
        console.error('Could not load', uri)
      })
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
      <Canvas
        // initialize camera for browser view at a standing height off the floor
        // (this will change once the HMD initializes)
        camera={{ 'position-y': 1.6, 'position-z': 0 }}
        // enable VR
        vr
      >
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

                  controllerGltf: getAsset('/data/system/xr/controller.glb'),
                  controlsGltf: getAsset('/data/system/xr/ui/controls.glb'),
                  boneGltf: getAsset('/data/system/dummies/bone.glb'),
                  virtualCameraGltf: getAsset('/data/system/xr/virtual-camera.glb'),
                  lightGltf: getAsset('/data/system/xr/light.glb'),
                  teleportTargetGltf: getAsset('/data/system/xr/teleport-target.glb'),

                  welcomeAudioBuffer,
                  atmosphereAudioBuffer,
                  selectAudioBuffer,
                  beamAudioBuffer,
                  teleportAudioBuffer,

                  undoBuffer,
                  redoBuffer,
                  boneHoverBuffer,
                  boneDroneBuffer,
                  fastSwooshBuffer,
                  dropBuffer,
                  uiCreateBuffer,
                  uiDeleteBuffer,

                  vrHelp1, vrHelp2, vrHelp3, vrHelp4, vrHelp5, vrHelp6, vrHelp7, vrHelp8, vrHelp9, vrHelp10
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
