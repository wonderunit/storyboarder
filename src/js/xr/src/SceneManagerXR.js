const SHOW_STATS = false
const SHOW_LOG = false

const THREE = require('three')
window.THREE = window.THREE || THREE
require('./three/GPUPickers/utils/Object3dExtension')

const { useMemo, useRef, useState, useEffect, useCallback, Suspense } = React = require('react')
const { Canvas, useThree, useUpdate, useFrame } = require('react-three-fiber')
const { connect, Provider, useSelector } = require('react-redux')
const useReduxStore = require('react-redux').useStore
const { createSelector } = require('reselect')

const TWEEN = require('@tweenjs/tween.js').default
const { useTranslation } = require('react-i18next')

const RemoteProvider = require('../../shot-generator/components/RemoteProvider').default
const RemoteClients = require('../../shot-generator/components/RemoteClients').default
const {ResourceInfo} = require('../../shared/network/client')

const XRClient = require("./components/XRClient").default
const { VRButton } = require('three/examples/jsm/webxr/VRButton')

const {
  // selectors
  getSceneObjects,
  getWorld,
  getActiveCamera,
  getSelections,

  // action creators
  selectObject,
  updateObject,
  updateCharacterIkSkeleton,
  getSelectedAttachable
} = require('../../shared/reducers/shot-generator')

const useRStats = require('./hooks/use-rstats')
const useIsXrPresenting = require('./hooks/use-is-xr-presenting')
const useTextureLoader = require('./hooks/use-texture-loader')
const useImageBitmapLoader = require('./hooks/use-imagebitmap-loader')
const useAudioLoader = require('./hooks/use-audio-loader')

const { WORLD_SCALE_LARGE, WORLD_SCALE_SMALL, useStore, useStoreApi, useInteractionsManager } = require('./use-interactions-manager')
const { useUiStore, useUiManager, UI_ICON_FILEPATHS } = require('./hooks/ui-manager')

const { useAssetsManager } = require('./hooks/use-assets-manager')
const getFilepathForModelByType = require('./helpers/get-filepath-for-model-by-type')
const getFilepathForImage = require('./helpers/get-filepath-for-image')

const ProgressIntro = require('./components/ProgressIntro').default

const Stats = require('./components/Stats')
const Ground = require('./components/Ground')
const Room = require('./components/Room')
const Character = require('./components/Character')
const Attachable = require('./components/Attachable')
const ModelObject = require('./components/ModelObject')
const Light = require('./components/Light')
const VirtualCamera = require('./components/VirtualCamera')
const Image = require('./components/Image')
const Environment = require('./components/Environment')
const Controller = require('./components/Controller')
const TeleportTarget = require('./components/TeleportTarget')
const { Log } = require('./components/Log')
const SimpleErrorBoundary = require('./components/SimpleErrorBoundary')

const Controls = require('./components/ui/Controls')
const Help = require('./components/ui/Help')
const Boards = require('./components/ui/Boards')

const BonesHelper = require('./three/BonesHelper')
const Voicer = require('./three/Voicer')

const musicSystem = require('./music-system')

// TODO load the language from the hosting shot generator peer
// currently i18n is hardcoded to en-US.json which is embedded within XR
const i18n = require('../../services/xr.i18next.config')

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

const getSceneObjectImageIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'image').map(o => o.id)
)

const getSceneObjectAttachableIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'attachable').map(o => o.id)
)

const systemEmotions = require('../../shared/reducers/shot-generator-presets/emotions.json')
function getEmotionTextureUriByPresetId (id) {
  // TODO provide XR FilepathsContext functions to get asset and user preset uri
  // console.log('EmotionID: ', id, systemEmotions[id])
  return systemEmotions[id]
    ? `/data/system/emotions/${id}-texture.png`
    : `/data/presets/emotions/${id}-texture.png`
}

const SceneContent = connect(
  state => ({
    aspectRatio: state.aspectRatio,
    sceneObjects: getSceneObjects(state),
    world: getWorld(state),
    activeCamera: getActiveCamera(state),
    selections: getSelections(state),
    models: state.models,
    selectedAttachable: getSelectedAttachable(state),
    boardUid: state.board.uid,

    characterIds: getSceneObjectCharacterIds(state),
    modelObjectIds: getSceneObjectModelObjectIds(state),
    attachablesIds: getSceneObjectAttachableIds(state),
    lightIds: getSceneObjectLightIds(state),
    virtualCameraIds: getSceneObjectVirtualCamerasIds(state),
    imageIds: getSceneObjectImageIds(state),
    language: state.language
  }),
  {
    selectObject,
    updateObject,
    updateCharacterIkSkeleton,
  }
)(
  ({
    aspectRatio, sceneObjects, world, activeCamera, selections, models,

    characterIds, modelObjectIds, lightIds, virtualCameraIds, imageIds, attachablesIds, boardUid, selectedAttachable, updateCharacterIkSkeleton, updateObject,

    resources, getAsset,
    language,

    SGConnection
  }) => {
    const { gl, camera, scene } = useThree()
    const teleportRef = useRef()
    // actions
    const set = useStore(state => state.set)
    // initialize behind the camera, on the floor

    useEffect(() => {
      if(!language) return
      // TODO
      // i18n.changeLanguage(language)
    }, [language])

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
    const showHUD = useUiStore(state => state.showHUD)
    const showConfirm = useUiStore(state => state.showConfirm)

    const fog = useRef()
    const getFog = () => {
      if (!fog.current) {
        fog.current = new THREE.Fog(world.backgroundColor, -10, world.fog.far)
      }
      return fog.current
    }

    useMemo(() => {
      scene.background = new THREE.Color(world.backgroundColor)

      getFog().color = new THREE.Color(world.backgroundColor)
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

    // music and sound
    const SOUND_FX_GAIN = 2
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
      audio.setVolume(0.35 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const atmosphereAudio = useMemo(() => {
      const audio = new THREE.PositionalAudio(cameraAudioListener)
      audio.setBuffer(resources.atmosphereAudioBuffer)
      audio.setFilter(atmosphereAudioFilter)
      audio.setLoop(true)
      audio.setVolume(0.35)
      audio.play()
      audio.stop()

      // attach the music system
      musicSystem.init({
        urlMap: {
          'C4': resources.instrumentC4,
          'C5': resources.instrumentC5,
          'C6': resources.instrumentC6
        },
        audioContext: audio.context,
        audioNode: audio,
        onComplete: musicSystem.start
      })

      return audio
    }, [])
    const beamVoicer = useMemo(() => {
      let voicer = new Voicer(cameraAudioListener, 6, resources.beamAudioBuffer, {
        releaseTime: 0.05
      })
      voicer.setVolume(0.5 * SOUND_FX_GAIN)
      return voicer
    }, [])
    const teleportAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.teleportAudioBuffer)
      audio.setLoop(false)
      audio.setVolume(1 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const selectAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.selectAudioBuffer)
      audio.setLoop(false)
      audio.setVolume(0.5 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])

    const undoAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.undoBuffer)
      audio.setLoop(false)
      audio.setVolume(1 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const redoAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.redoBuffer)
      audio.setLoop(false)
      audio.setVolume(1 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const boneHoverVoicer = useMemo(() => {
      let voicer = new Voicer(cameraAudioListener, 8, resources.boneHoverBuffer)
      voicer.setVolume(1 * SOUND_FX_GAIN)
      return voicer
    }, [])
    const boneDroneVoicer = useMemo(() => {
      let voicer = new Voicer(cameraAudioListener, 8, resources.boneDroneBuffer, {
        releaseTime: 0.2
      })
      voicer.setVolume(0.6 * SOUND_FX_GAIN)
      return voicer
    }, [])
    const fastSwooshAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.fastSwooshBuffer)
      audio.setLoop(false)
      audio.setVolume(0.1 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const dropAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.dropBuffer)
      audio.play()
      audio.stop()
      audio.setVolume(1 * SOUND_FX_GAIN)
      return audio
    }, [])
    const uiCreateAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.uiCreateBuffer)
      audio.setLoop(false)
      audio.setVolume(1 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])

    const xrPosing = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.xrPosing)
      audio.setVolume(0.35 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])

    const xrEndPosing = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.xrEndPosing)
      audio.setVolume(0.35 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])

    const uiDeleteAudio = useMemo(() => {
      let audio = new THREE.Audio(cameraAudioListener)
      audio.setBuffer(resources.uiDeleteBuffer)
      audio.setLoop(false)
      audio.setVolume(1 * SOUND_FX_GAIN)
      audio.play()
      audio.stop()
      return audio
    }, [])
    const helpVoicer = useMemo(() => {
      let voicer = new Voicer(cameraAudioListener, 10, null, {
        releaseTime: 0.01,
        voiceOptions: {
          positional: false
        }
      })
      voicer.setVolume(0.5 * SOUND_FX_GAIN)
      return voicer
    }, [])

    const isXrPresenting = useIsXrPresenting()
    useEffect(() => {
      if (isXrPresenting) {
        if (!welcomeAudio.isPlaying) welcomeAudio.play()
        if (!atmosphereAudio.isPlaying) atmosphereAudio.play()
        SGConnection.setActive(true)
      } else {
        SGConnection.setActive(false)
        welcomeAudio.isPlaying && welcomeAudio.stop()
        atmosphereAudio.isPlaying && atmosphereAudio.stop()
      }
    }, [isXrPresenting])

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
        case 'posing':
          console.log("Play posing")
          xrPosing.stop()
          xrPosing.play()
          break;
        case 'endPosing':
          console.log("Play endPosing")
          xrEndPosing.stop()
          xrEndPosing.play()
          break;
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
    const thumbnailRenderer = useRef()
    const { uiService, uiCurrent, getCanvasRenderer, canvasRendererRef } = useUiManager({ playSound, stopSound, SG: SGConnection })

    const realCamera = useMemo(() => new THREE.PerspectiveCamera(), [])
    useEffect(() => {
      camera.parent.attach(realCamera)
    }, []) 
    const { controllers, interactionServiceCurrent, interactionServiceSend } = useInteractionsManager({
      groundRef,
      rootRef,
      uiService,
      playSound,
      stopSound,
      realCamera,
      SGConnection
    })
    
    useFrame(({camera, gl}) => {
      TWEEN.update()
      if (gl.xr.getSession() && isXrPresenting) {
        gl.xr.getCamera(realCamera)

        let matrixWorld = realCamera.matrixWorld.clone()
        matrixWorld.premultiply(camera.parent.getInverseMatrixWorld())
        matrixWorld.decompose(realCamera.position, realCamera.quaternion, realCamera.scale)
        realCamera.updateWorldMatrix(false, true)

        
        SGConnection.sendInfo({
          matrix: realCamera.matrixWorld.toArray(),
          controllers: controllers.map((object) => object.matrixWorld.toArray())
        })
      }
    })

    canvasRendererRef.current.interactionServiceSend = interactionServiceSend

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

    useEffect(() => {
      thumbnailRenderer.current = new THREE.WebGLRenderer()
      thumbnailRenderer.current.setSize(128 * aspectRatio, 128)
      return () => {
        thumbnailRenderer.current.forceContextLoss()
        thumbnailRenderer.current.context = null
        thumbnailRenderer.current.domElement = null
        thumbnailRenderer.current = null
      }
    }, [aspectRatio])

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

          { showHUD &&
            <Boards
              mode={uiCurrent.value.controls}
              locked={uiCurrent.context.locked}
              getCanvasRenderer={getCanvasRenderer}
              showConfirm={showConfirm}
              showSettings={canvasRendererRef.current.state.showSettings} />
          }

          {controllers
            .map(controller =>
              controller.userData.inputSource && <primitive
                key={controller.uuid}
                // for grip, use gl.xr.getControllerGrip(controller.userData.inputSourceIndex)
                object={controller}
              >
                <Controller
                  gltf={resources.controllerGltf}
                  hand={controller.userData.inputSource.handedness}
                />
                {controller.userData.inputSource.handedness === (switchHand ? 'left' : 'right') &&
                  <group>
                    <Controls
                      gltf={resources.controlsGltf}
                      mode={uiCurrent.value.controls}
                      hand={switchHand ? 'left' : 'right'}
                      locked={uiCurrent.context.locked}
                      getCanvasRenderer={getCanvasRenderer} />
                    { showHelp &&
                      <Help
                        mode={uiCurrent.value.controls}
                        locked={uiCurrent.context.locked}
                        getCanvasRenderer={getCanvasRenderer} />
                    }
                  </group>
                }
              </primitive>
            )
          }
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
            characterIds.map(id => {
              let sceneObject = sceneObjects[id]    
              let { emotionPresetId } = sceneObject
              // console.log(sceneObject)
              let textureUri = sceneObject.emotionPresetId && getEmotionTextureUriByPresetId(emotionPresetId)
              let texture = textureUri && getAsset(textureUri)
               return <SimpleErrorBoundary key={id}>
                  <Character
                    key={id}
                    gltf={getAsset(getFilepathForModelByType(sceneObject))}
                    sceneObject={sceneObject}
                    modelSettings={models[sceneObject.model] || undefined}
                    isSelected={selections.includes(id)}
                    updateSkeleton={updateCharacterIkSkeleton} 
                    texture={texture}/>
                </SimpleErrorBoundary>
            })
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
            attachablesIds.map(id => {
              let sceneObject = sceneObjects[id]
              let characterModel = getAsset(getFilepathForModelByType(sceneObjects[sceneObject.attachToId]))
              let gltf = getAsset(getFilepathForModelByType(sceneObjects[id]))
              let character = scene.__interaction.filter(o => o.userData.id === sceneObject.attachToId)[0]
              return <SimpleErrorBoundary key={id}>
                  <Attachable
                    key={id}
                    gltf={gltf}
                    sceneObject={sceneObjects[id]}
                    isSelected={ selectedAttachable === id ? true : false}
                    modelSettings={models[sceneObjects[id].model] || undefined}
                    updateObject={updateObject}
                    characterModel={ characterModel }
                    characterChildrenLength={ character ? character.children.length : 0 }
                    rootRef={ rootRef.current } 
                    character={ sceneObjects[sceneObject.attachToId] }/>
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
                getCanvasRenderer={getCanvasRenderer}
                thumbnailRenderer={thumbnailRenderer}
                boardUid={boardUid}
                audio={
                  activeCamera === id
                    ? atmosphereAudio
                    : null
                }
              />
            )
          }

          {
            imageIds.map(id => {
              let sceneObject = sceneObjects[id]
              let texture = getAsset(getFilepathForImage(sceneObject))

              return <Image
                key={id}
                texture={texture}
                sceneObject={sceneObject}
                visibleToCam={sceneObject.visibleToCam}
                isSelected={selections.includes(id)}/>
            })
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
                  visible={world.environment.visible}
                  grayscale={ world.environment.grayscale } />
              </SimpleErrorBoundary>
              : null
          }
          
          <RemoteProvider>
            <RemoteClients
              clientProps={{
                helmet: resources.hmdGltf,
                controller: resources.controllerGltf,
              }}
              Component={XRClient}
            />
          </RemoteProvider>

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

const XRStartButton = () => {
  const { gl } = useThree()

  useMemo(() => { 
    document.body.appendChild(VRButton.createButton(gl))
  }, [])

  return null
}

const APP_GLTFS = [
  '/data/system/xr/controller.glb',
  '/data/system/xr/ui/controls.glb',
  '/data/system/dummies/bone.glb',
  '/data/system/xr/virtual-camera.glb',
  '/data/system/xr/light.glb',
  '/data/system/xr/teleport-target.glb',
  '/data/system/xr/hmd.glb'
]

const SceneManagerXR = ({SGConnection}) => {
  useMemo(() => {
    THREE.Cache.enabled = true
  }, [])

  const store = useReduxStore()
  const [appAssetsLoaded, setAppAssetsLoaded] = useState(false)

  const { assets, requestAsset, getAsset } = useAssetsManager(SGConnection)

  // preload textures
  const groundTexture = useTextureLoader(SGConnection, '/data/system/grid_floor_1.png')
  const roomTexture = useTextureLoader(SGConnection, '/data/system/grid_wall2.png')

  // preload icons
  const uiResources = UI_ICON_FILEPATHS.map((icon) => useImageBitmapLoader(SGConnection, icon))

  // preload app gltfs
  useEffect(
    () => APP_GLTFS.forEach(requestAsset),
    []
  )

  // preload audio
  const welcomeAudioBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-welcome.ogg')
  const atmosphereAudioBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-drone.ogg')
  const selectAudioBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-select.ogg')
  const beamAudioBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-drag-drone.ogg')
  const teleportAudioBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-teleport.ogg')

  const undoBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-ui-undo.ogg')
  const redoBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-ui-redo.ogg')
  const boneHoverBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-bone-hover.ogg')
  const boneDroneBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-bone-drone.ogg')
  const fastSwooshBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-fast-swoosh.ogg')
  const dropBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-drop.ogg')
  const uiCreateBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-ui-create.ogg')
  const uiDeleteBuffer = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-ui-delete.ogg')

  const vrHelp1 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-1.ogg')
  const vrHelp2 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-2.ogg')
  const vrHelp3 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-3.ogg')
  const vrHelp4 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-4.ogg')
  const vrHelp5 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-5.ogg')
  const vrHelp6 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-6.ogg')
  const vrHelp7 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-7.ogg')
  const vrHelp8 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-8.ogg')
  const vrHelp9 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-9.ogg')
  const vrHelp10 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-help-10.ogg')

  const xrPosing = useAudioLoader(SGConnection, '/data/system/xr/snd/xr-posing.ogg')
  const xrEndPosing = useAudioLoader(SGConnection, '/data/system/xr/snd/xr-end-posing.ogg')

  const instrumentC4 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-instrument-c4.ogg')
  const instrumentC5 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-instrument-c5.ogg')
  const instrumentC6 = useAudioLoader(SGConnection, '/data/system/xr/snd/vr-instrument-c6.ogg')

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


  useEffect(() => {
    Object.values(sceneObjects)
      // is not an image
      .filter(o => o.type === 'image')
      // what's the filepath?
      .map(getFilepathForImage)
      // has not been requested
      .filter(filepath => getAsset(filepath) == null)
      // request the file
      .forEach(requestAsset)
  }, [sceneObjects])

  // world model files
  useEffect(() => {
    if (world.environment.file) {
      // TODO figure out why gltf.scene.children of environment becomes empty array when changing between boards
      const environmentPath = getFilepathForModelByType({
        type: 'environment',
        model: world.environment.file
      })

      delete assets[environmentPath]

      requestAsset(environmentPath)
    }
  }, [world.environment])

  let appResources = [groundTexture, roomTexture]
  let soundResources = [
    welcomeAudioBuffer, atmosphereAudioBuffer, selectAudioBuffer, beamAudioBuffer,
    teleportAudioBuffer,
    undoBuffer, redoBuffer, boneHoverBuffer, boneDroneBuffer, fastSwooshBuffer, dropBuffer,
    uiCreateBuffer, uiDeleteBuffer,
    vrHelp1, vrHelp2, vrHelp3, vrHelp4, vrHelp5, vrHelp6, vrHelp7, vrHelp8, vrHelp9, vrHelp10,
    xrPosing, xrEndPosing,
    instrumentC4, instrumentC5, instrumentC6
  ]
  let gltfResources = APP_GLTFS.map(getAsset)

  const assetIncomplete = useCallback(a => a => a === null || (a.status !== 'Success' && a.status !== 'Error'), [])
  const assetLoaded = useCallback(a => a => a !== null && a.status === 'Success', [])

  useEffect(() => {
    if (!appAssetsLoaded) {
      let appResources = [groundTexture, roomTexture]
      let soundResources = [
        welcomeAudioBuffer, atmosphereAudioBuffer, selectAudioBuffer, beamAudioBuffer,
        teleportAudioBuffer,
        undoBuffer, redoBuffer, boneHoverBuffer, boneDroneBuffer, fastSwooshBuffer, dropBuffer,
        uiCreateBuffer, uiDeleteBuffer,
        vrHelp1, vrHelp2, vrHelp3, vrHelp4, vrHelp5, vrHelp6, vrHelp7, vrHelp8, vrHelp9, vrHelp10,
        xrPosing, xrEndPosing,
        instrumentC4, instrumentC5, instrumentC6
      ]

      // fail if any app resources are missing
      if ([...appResources, ...soundResources, ...uiResources, ...gltfResources].some(n => n === null)) return
      //if (gltfResources.some(n => n === null)) return

      setAppAssetsLoaded(true)
    }
  }, [appAssetsLoaded, groundTexture, roomTexture, uiResources, assets])

  const [currentMsg, setCurrentMsg] = useState('Waiting for the assets..')
  const progress = useMemo(() => {
    let assetsValues = Object.values(assets)

    let count = appResources.length + soundResources.length + uiResources.length + assetsValues.length

    let globalResourcesLoaded = [...appResources, ...soundResources, ...uiResources].filter(res => res !== null).length + assetsValues.filter(assetLoaded).length
    let progress = (globalResourcesLoaded / count) * 100
    
    return progress
  }, [...appResources, ...soundResources, ...uiResources, assets])

  useEffect(() => {
    ResourceInfo.on('willLoad', path => setCurrentMsg('Loading: ' + path))
  }, [setCurrentMsg])

  const [isLoading, setIsLoading] = useState(false)
  const [sceneObjectsPreloaded, setSceneObjectsPreloaded] = useState(false)
  useEffect(() => {
    let incomplete = a => a.status !== 'Success' && a.status !== 'Error'
    let remaining = Object.values(assets).filter(incomplete)

    if (isLoading && !sceneObjectsPreloaded && remaining.length === 0) {
      setSceneObjectsPreloaded(true)
      setIsLoading(false)

      let assetsWithErrors = Object.entries(assets).reduce((arr, [key, asset]) => {
        if (asset.status === 'Error') {
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
        !ready && <ProgressIntro value={progress} msg={currentMsg} />
      }
      <Canvas
        // initialize camera for browser view at a standing height off the floor
        // (this will change once the HMD initializes)
        camera={{
          'position-y': 1.6, 'position-z': 0
        }}
        // enable VR
        vr
      >
        <Provider store={store}>
          <Suspense fallback="loading">

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
                  hmdGltf: getAsset('/data/system/xr/hmd.glb'),

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

                  vrHelp1, vrHelp2, vrHelp3, vrHelp4, vrHelp5, vrHelp6, vrHelp7, vrHelp8, vrHelp9, vrHelp10,
                  xrPosing, xrEndPosing,
                  instrumentC4, instrumentC5, instrumentC6
                }}
                getAsset={getAsset}
                SGConnection={SGConnection} />
              : null
          }

          </Suspense>
        </Provider>
      </Canvas>
      <div className='scene-overlay' />
    </>
  )
}

module.exports = SceneManagerXR
