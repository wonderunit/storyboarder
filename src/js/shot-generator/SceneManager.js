const { Provider, connect } = require('react-redux')
const React = require('react')
const { useState, useEffect, useRef, useContext } = React

const h = require('../utils/h')

const {
  selectObject,
  selectObjectToggle,
  updateObject,
  selectBone,
  updateCharacterSkeleton,
  createPosePreset,
  updateWorldEnvironment,

  getSceneObjects,
  getSelections,
  getActiveCamera,
  getSelectedBone,
  getWorld,

  undoGroupStart,
  undoGroupEnd
} = require('../shared/reducers/shot-generator')

const {
  SceneContext,
  Camera,
  animatedUpdate,
  stats
} = require('./Components')

const CameraControls = require('./CameraControls')
const SelectionManager = require('./SelectionManager')
// const SelectionsMover = require('./SelectionsMover')

const Character = require('./Character')
const SpotLight = require('./SpotLight')
const Volumetric = require('./Volumetric')
const SceneObject = require('./SceneObject')

const WorldObject = require('./World')

const ModelLoader = require('../services/model-loader')

const SceneManager = connect(
  state => ({
    world: getWorld(state),
    sceneObjects: getSceneObjects(state),
    remoteInput: state.input,
    selections: getSelections(state),
    selectedBone: getSelectedBone(state),
    mainViewCamera: state.mainViewCamera,
    activeCamera: getActiveCamera(state),
    aspectRatio: state.aspectRatio,
    devices: state.devices,
    meta: state.meta,
    // HACK force reset skeleton pose on Board UUID change
    _boardUid: state.board.uid
  }),
  {
    updateObject,
    selectObject,
    selectObjectToggle,
    animatedUpdate,
    selectBone,
    updateCharacterSkeleton,
    createPosePreset,
    updateWorldEnvironment,

    undoGroupStart,
    undoGroupEnd
  }
)(
  ({ world, sceneObjects, updateObject, selectObject, selectObjectToggle, remoteInput, largeCanvasRef, smallCanvasRef, selections, selectedBone, machineState, transition, animatedUpdate, selectBone, mainViewCamera, updateCharacterSkeleton, largeCanvasSize, activeCamera, aspectRatio, devices, meta, _boardUid, updateWorldEnvironment, attachments, undoGroupStart, undoGroupEnd }) => {
    const { scene } = useContext(SceneContext)
    // const modelCacheDispatch = useContext(CacheContext)

    let [camera, setCamera] = useState(null)
    const [shouldRaf, setShouldRaf] = useState(true)

    let largeRenderer = useRef(null)
    let largeRendererEffect = useRef(null)
    let smallRenderer = useRef(null)
    let smallRendererEffect = useRef(null)
    let animator = useRef(null)
    let animatorId = useRef(null)

    let cameraControlsView = useRef(null)

    let bonesHelper = useRef(null)
    let lightHelper = useRef(null)

    let clock = useRef(new THREE.Clock())

    let orthoCamera = useRef(new THREE.OrthographicCamera( -4, 4, 4, -4, 1, 10000 ))

    useEffect(() => {
      console.log('new SceneManager')

      scene.background = new THREE.Color(world.backgroundColor)
      //scene.add(new THREE.AmbientLight(0x161616, 1))

      // let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1)
      // directionalLight.position.set(0, 1, 3)
      // scene.add(directionalLight)

      orthoCamera.current.position.y = 900
      orthoCamera.current.rotation.x = -Math.PI / 2
    }, [])

    useEffect(() => {
      const onVisibilityChange = event => {
        // console.log('SceneManager onVisibilityChange', document.hidden, event)
        if (document.hidden) {
          setShouldRaf(false)
        } else {
          setShouldRaf(true)
        }
      }

      const onBlur = event => {
        // console.log('SceneManager onBlur')
        setShouldRaf(false)
      }

      const onFocus = event => {
        // console.log('SceneManager onFocus')
        setShouldRaf(true)
      }

      document.addEventListener('visibilitychange', onVisibilityChange)
      window.addEventListener('blur', onBlur)
      window.addEventListener('focus', onFocus)

      return function cleanup () {
        document.removeEventListener('visibilitychange', onVisibilityChange)
        window.removeEventListener('blur', onBlur)
        window.removeEventListener('focus', onFocus)
      }
    }, [])

    useEffect(() => {
      largeRenderer.current = new THREE.WebGLRenderer({
        canvas: largeCanvasRef.current,
        antialias: true
      })
      // largeRenderer.current.setSize(
      //   largeCanvasSize.width,
      //   largeCanvasSize.height
      // )

      largeRendererEffect.current = new THREE.OutlineEffect( largeRenderer.current, {defaultThickness:0.008} )

      smallRenderer.current = new THREE.WebGLRenderer({
        canvas: smallCanvasRef.current,
        antialias: true
      })
      smallRenderer.current.setSize(
        300,
        300,
      )
      smallRendererEffect.current = new THREE.OutlineEffect( smallRenderer.current, {defaultThickness:0.02, defaultAlpha:0.5, defaultColor: [ 0.4, 0.4, 0.4 ], ignoreMaterial: true} )
    }, [])

    // resize the renderers (large and small)
    // FIXME this is running _after_ the animation frame, causing a visible jump
    useEffect(() => {

      //seems this is called a bit often, see later about reducing hooks

      // how wide is the canvas which will render the large view?
      let width = Math.ceil(largeCanvasSize.width)
      // assign a target height, based on scene aspect ratio
      let height = Math.ceil(width / aspectRatio)

      let minMax = [9999,-9999,9999,-9999]

      // go through all appropriate opbjects and get the min max
      let numVisible = 0
      for (child of scene.children) {
        if (
          child.userData &&
          child.userData.type === 'object' ||
          child.userData.type === 'character' ||
          child.userData.type === 'light' ||
          child.userData.type === 'volume' ||
          child instanceof THREE.PerspectiveCamera
        ) {
          minMax[0] = Math.min(child.position.x, minMax[0])
          minMax[1] = Math.max(child.position.x, minMax[1])
          minMax[2] = Math.min(child.position.z, minMax[2])
          minMax[3] = Math.max(child.position.z, minMax[3])
          numVisible++
        }
      }

      // if only one object is in the scene (a single camera)
      if (numVisible === 1) {
        // add some extra padding
        minMax[0] -= 2
        minMax[1] += 2
        minMax[2] -= 2
        minMax[3] += 2
      }

      // add some padding
      minMax[0] -= 2
      minMax[1] += 2
      minMax[2] -= 2
      minMax[3] += 2

      // get the aspect ratio of the container window
      // target aspect ratio
      let rs = (mainViewCamera === 'live')
        ? 1
        : aspectRatio

      // make sure the min max box fits in the aspect ratio
      let mWidth = minMax[1]-minMax[0]
      let mHeight = minMax[3]-minMax[2]
      let mAspectRatio = (mWidth/mHeight)

      if (mAspectRatio>rs) {
        let padding = (mWidth / (1/rs))-mHeight
        minMax[2] -= padding/2
        minMax[3] += padding/2
      } else {
        let padding = (mHeight / (1/rs))-mWidth
        minMax[0] -= padding/2
        minMax[1] += padding/2
      }

      orthoCamera.current.position.x = minMax[0]+((minMax[1]-minMax[0])/2)
      orthoCamera.current.position.z = minMax[2]+((minMax[3]-minMax[2])/2)
      orthoCamera.current.left = -(minMax[1]-minMax[0])/2
      orthoCamera.current.right = (minMax[1]-minMax[0])/2
      orthoCamera.current.top = (minMax[3]-minMax[2])/2
      orthoCamera.current.bottom = -(minMax[3]-minMax[2])/2
      orthoCamera.current.near = -1000
      orthoCamera.current.far = 1000

      orthoCamera.current.updateProjectionMatrix()

      orthoCamera.current.layers.enable(2)

      // resize the renderers
      if (mainViewCamera === 'live') {
        // ortho camera is small
        smallRenderer.current.setSize(300, 300)
        smallRendererEffect.current.setParams({
          defaultThickness:0.02,
          ignoreMaterial: true,
          defaultColor: [ 0.4, 0.4, 0.4 ]
        })

        // perspective camera is large
        largeRenderer.current.setSize(width, height)

        largeRendererEffect.current.setParams({
          defaultThickness:0.008,
          ignoreMaterial: false,
          defaultColor: [0, 0, 0]
        })

      } else {
        // ortho camera is large
        largeRenderer.current.setSize(width, height)
        largeRendererEffect.current.setParams({
          defaultThickness:0.013,
          ignoreMaterial: true,
          defaultColor: [ 0.4, 0.4, 0.4 ]
        })
        // perspective camera is small
        smallRenderer.current.setSize(
          Math.floor(300),
          Math.floor(300 / aspectRatio)
        )
        smallRendererEffect.current.setParams({
          defaultThickness:0.008,
          ignoreMaterial: false,
          defaultColor: [0, 0, 0]
        })
      }
    }, [sceneObjects, largeCanvasSize, mainViewCamera, aspectRatio])

    useEffect(() => {
      setCamera(scene.children.find(o => o.userData.id === activeCamera))
    }, [activeCamera])

    useEffect(() => {
      if (camera) {
        console.log('camera changed')

        // state of the active camera
        let cameraState = Object.values(sceneObjects).find(o => o.id === camera.userData.id)
        if (!cameraControlsView.current) {
          console.log('new CameraControls')
          cameraControlsView.current = new CameraControls(
            CameraControls.objectFromCameraState(cameraState),
            largeCanvasRef.current,
            {
              undoGroupStart,
              undoGroupEnd
            }
          )
        }

        animator.current = () => {
          if (stats) { stats.begin() }
          if (scene && camera) {

            animatedUpdate((dispatch, state) => {
              let cameraForSmall = state.mainViewCamera === 'ortho' ? camera : orthoCamera.current
              let cameraForLarge = state.mainViewCamera === 'live' ? camera : orthoCamera.current

              if (cameraControlsView.current && cameraControlsView.current.enabled) {
                let cameraState = Object.values(getSceneObjects(state)).find(o => o.id === camera.userData.id)

                if (!cameraState) {
                  // FIXME
                  // when loading a new scene, rAF might run with a state reference
                  // should reset reset animator.current when loading
                  // for now, just prevent attempting to render when in conflicting state
                  console.warn('prevented render with missing camera state')
                  return
                }

                cameraControlsView.current.object = CameraControls.objectFromCameraState(cameraState)

                // step
                cameraControlsView.current.update( clock.current.getDelta(), state )

                // update object state with the latest values
                let cameraId = camera.userData.id
                let { x, y, z, rotation, tilt, fov } = cameraControlsView.current.object

                // if props changed
                if (
                  cameraState.x != x ||
                  cameraState.y != y ||
                  cameraState.z != z ||
                  cameraState.rotation != rotation ||
                  cameraState.tilt != tilt ||
                  cameraState.fov != fov
                ) {
                  // update the camera state
                  updateObject(cameraId, {
                    x,
                    y,
                    z,
                    rotation,
                    tilt,
                    fov
                  })
                }
              }
              let tempColor = scene.background.clone()
              if (state.mainViewCamera === 'live') {
                largeRendererEffect.current.render(scene, cameraForLarge)
                scene.background.set(new THREE.Color( '#FFFFFF' ))
                smallRendererEffect.current.render( scene, cameraForSmall)
                scene.background.set(tempColor)

              } else {
                scene.background.set(new THREE.Color( '#FFFFFF' ))
                largeRendererEffect.current.render(scene, cameraForLarge)
                scene.background.set(tempColor)
                smallRendererEffect.current.render( scene, cameraForSmall)
              }
            })
          }
          if (stats) { stats.end() }
          animatorId.current = requestAnimationFrame(animator.current)
        }

        if (shouldRaf) {
          animatorId.current = requestAnimationFrame(animator.current)
        }
      }

      return function cleanup () {
        console.log('cameraControls setter cleanup')

        cancelAnimationFrame(animatorId.current)
        animator.current = () => {}
        animatorId.current = null

        if (cameraControlsView.current) {
          // remove camera controls event listeners and null the reference
          cameraControlsView.current.dispose()
          cameraControlsView.current = null
        }
      }
    }, [camera, shouldRaf])

    // see code in rAF
    // useEffect(() => {}, [mainViewCamera])

    useEffect(() => {
      let sceneObject = null
      let child = null

      if (selections.length === 1) {
        child = scene.children.find(o => o.userData.id === selections[0])
        sceneObject = sceneObjects[selections[0]]
        //if light - add helper

        // if (sceneObject.type === 'light') {
        //   if (lightHelper.current !== child)
        //   {
        //     scene.remove(lightHelper.current)
        //     lightHelper.current = child.helper
        //     scene.add(lightHelper.current)
        //   }
        // } else {
        //   if (lightHelper.current)
        //   {
        //     scene.remove(lightHelper.current)
        //     lightHelper.current = null
        //   }
        // }

        //if character
        //if (child && ((child.children[0] && child.children[0].skeleton) || (child.children[1] && child.children[1].skeleton) || (child.children[2] && child.children[2].skeleton)) && sceneObject.visible) {
        if (child && child.userData.type === 'character') {
          let skel = child.children.find(cld => cld instanceof THREE.SkinnedMesh) ||
            child.children[0].children.find(cld => cld instanceof THREE.SkinnedMesh)

          if (
            // there is not a BonesHelper instance
            !bonesHelper.current ||
            // or, there is a BonesHelper instance pointing to the wrong object
            bonesHelper.current.root !== skel.skeleton.bones[0]
          ) {
            bonesHelper.current = child.bonesHelper
          }
        } else {
          bonesHelper.current = null
        }
      } else {

        //if nothing selected
        bonesHelper.current = null
      }

    }, [selections, sceneObjects])

    useEffect(() => {
      if (camera && cameraControlsView.current) {
        if (mainViewCamera === 'ortho') {
          cameraControlsView.current.enabled = false
          return
        }

        if (machineState.matches('idle')) {
          cameraControlsView.current.reset()
          cameraControlsView.current.enabled = true
        } else {
          cameraControlsView.current.reset()
          cameraControlsView.current.enabled = false
        }
      }
    }, [machineState.value, camera, cameraControlsView.current, mainViewCamera])

    const components = Object.values(sceneObjects).map(props => {
      let modelCacheKey

      switch (props.type) {
          case 'object':
            try {
              modelCacheKey = ModelLoader.getFilepathForModel({ model: props.model, type: props.type }, { storyboarderFilePath: meta.storyboarderFilePath })
            } catch (err) {
              // console.log('migrating from absolute path')
            }
            return [
              SceneObject, {
                key: props.id,
                scene,

                remoteInput,
                isSelected: selections.includes(props.id),

                camera,

                updateObject,

                storyboarderFilePath: meta.storyboarderFilePath,

                ...(props.model === 'box'
                  ? {
                    loaded: true,
                    modelData: {}
                  }
                  : {
                    loaded: props.loaded ? props.loaded : false,
                    modelData: attachments[modelCacheKey] && attachments[modelCacheKey].value,
                  }
                ),

                ...props
              }
            ]

          case 'character':
            try {
              modelCacheKey = ModelLoader.getFilepathForModel({
                model: props.model,
                type: props.type
              }, {
                storyboarderFilePath: meta.storyboarderFilePath
              })
            } catch (err) {
              console.error(err)
              // console.log('migrating from absolute path')
            }

            return [
              Character, {
                key: props.id,
                scene,

                remoteInput,
                isSelected: selections.includes(props.id),
                selectedBone,

                camera,

                updateCharacterSkeleton,
                updateObject,

                devices,

                // HACK force reset skeleton pose on Board UUID change
                boardUid: _boardUid,

                storyboarderFilePath: meta.storyboarderFilePath,
                loaded: props.loaded ? props.loaded : false,
                modelData: attachments[modelCacheKey] && attachments[modelCacheKey].value,

                ...props
              }
            ]

          case 'camera':
            return [
              Camera, {
                key: props.id,
                scene,

                setCamera,

                isSelected: selections.includes(props.id),

                aspectRatio,
                ...props
              }
            ]

            case 'volume':
              return [
                Volumetric, {
                  key: props.id,
                  scene,
                  isSelected: selections.includes(props.id),
                  camera,
                  updateObject,
                  numberOfLayers: props.numberOfLayers,
                  distanceBetweenLayers: props.distanceBetweenLayers,

                  storyboarderFilePath: meta.storyboarderFilePath,
                  volumeImageAttachmentIds: props.volumeImageAttachmentIds,

                  ...props
                }
              ]

            case 'light':
              return [
                SpotLight, {
                  key: props.id,
                  scene,
                  isSelected: selections.includes(props.id),
                  ...props
                }
              ]

        }
    })

    let worldEnvironmentFileCacheKey

    if (world.environment.file) {
      worldEnvironmentFileCacheKey = ModelLoader.getFilepathForModel(
        { model: world.environment.file, type: 'environment' },
        { storyboarderFilePath: meta.storyboarderFilePath }
      )
    }

    const worldComponent = [
      WorldObject,
      {
        key: 'world',
        world,
        scene,
        modelData: (
          attachments[worldEnvironmentFileCacheKey] &&
          attachments[worldEnvironmentFileCacheKey].value
        )
      }
    ]
    // TODO Scene parent object??
    return [
      [
        [SelectionManager, {
          key: 'selection-manager-large',
          SceneContext,
          camera: mainViewCamera === 'live' ? camera : orthoCamera.current,
          el: largeCanvasRef.current,
          selectOnPointerDown: mainViewCamera !== 'live',
          useIcons: mainViewCamera !== 'live',
          transition
        }],

        [SelectionManager, {
          key: 'selection-manager-small',
          SceneContext,
          camera: mainViewCamera === 'live' ? orthoCamera.current : camera,
          el: smallCanvasRef.current,
          selectOnPointerDown: mainViewCamera === 'live',
          useIcons: mainViewCamera === 'live',
          transition
        }],

        // [SelectionsMover, {
        //   key: 'selections-mover',
        //   scene,
        //   camera
        // }],

        worldComponent,
        ...components
      ].map(c => h(c))
    ]
  }
)

module.exports = SceneManager