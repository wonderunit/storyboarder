import {getScene} from "./utils/scene"

const { Provider, connect } = require('react-redux')
const React = require('react')
const { useState, useEffect, useRef, useContext, useMemo, useLayoutEffect, useCallback } = React
const { dropObject, dropCharacter } = require('../utils/dropToObjects')
require('../vendor/OutlineEffect')
const KeyCommandsSingleton = require('./components/KeyHandler/KeyCommandsSingleton').default
const { setShot } = require('./utils/cameraUtils')
const h = require('../utils/h')
const SGIkHelper = require('../shared/IK/SGIkHelper')
const {
  selectObject,
  selectObjectToggle,
  updateObject,
  updateObjects,
  deleteObjects,
  selectBone,
  updateCharacterSkeleton,
  updateCharacterIkSkeleton,
  createPosePreset,
  updateWorldEnvironment,

  getSceneObjects,
  getSelections,
  getActiveCamera,
  getSelectedBone,
  getWorld,

  undoGroupStart,
  undoGroupEnd,
  getSelectedAttachable
} = require('../shared/reducers/shot-generator')
const { createSelector } = require('reselect')

// const {
//   SceneContext,
//   stats
// } = require('./Components')

const animatedUpdate = (fn) => (dispatch, getState) => fn(dispatch, getState())

const CameraControls = require('./CameraControls')
const SelectionManager = require('./components/SelectionManager').default

const Character = require('./Character')
const SpotLight = require('./SpotLight')
const Volumetric = require('./Volumetric')
const SceneObject = require('./SceneObject')
const Group = require('./Group')
const Camera = require('./Camera')
const Image = require('./Image')
const Attachable = require('./attachables/Attachable')

const WorldObject = require('./World')

const ModelLoader = require('../services/model-loader')
/**
 * Return the first index containing an *item* which is greater than *item*.
 * @arguments _(item)_
 * @example
 *  indexOfGreaterThan([10, 5, 77, 55, 12, 123], 70) // => 2
 * via mohayonao/subcollider
 */
const indexOfGreaterThan = (array, item) => {
  for (var i = 0, imax = array.length; i < imax; ++i) {
    if (array[i] > item) { return i }
  }
  return -1
}

/**
 * Returns the closest index of the value in the array (collection must be sorted).
 * @arguments _(item)_
 * @example
 *  indexIn([2, 3, 5, 6], 5.2) // => 2
 * via mohayonao/subcollider
 */
const indexIn = (array, item) => {
  var i, j = indexOfGreaterThan(array, item)
  if (j === -1) { return array.length - 1 }
  if (j ===  0) { return j }
  i = j - 1
  return ((item - array[i]) < (array[j] - item)) ? i : j
}

const getCameraSceneObjects = createSelector(
  [getSceneObjects],
  (sceneObjects) => Object.values(sceneObjects).filter(o => o.type === 'camera')
)

const SceneManager = connect(
  state => ({
    world: getWorld(state),
    sceneObjects: getSceneObjects(state),
    remoteInput: state.input,
    selections: getSelections(state),
    selectedBone: getSelectedBone(state),
    selectedAttachable: getSelectedAttachable(state),
    mainViewCamera: state.mainViewCamera,
    activeCamera: getActiveCamera(state),
    aspectRatio: state.aspectRatio,
    devices: state.devices,
    meta: state.meta,
    cameraShots: state.cameraShots,
    // HACK force reset skeleton pose on Board UUID change
    _boardUid: state.board.uid,
    _cameras: getCameraSceneObjects(state)
  }),
  {
    updateObject,
    updateObjects,
    selectObject,
    selectObjectToggle,
    selectBone,
    updateCharacterSkeleton,
    updateCharacterIkSkeleton,
    createPosePreset,
    updateWorldEnvironment,
    deleteObjects,
    undoGroupStart,
    undoGroupEnd,
    animatedUpdate
  }
)(
  ({ world, sceneObjects, updateObject, selectObject, selectObjectToggle, remoteInput, largeCanvasRef, smallCanvasRef, selections, selectedBone, selectBone, mainViewCamera, updateCharacterSkeleton, updateCharacterIkSkeleton, largeCanvasSize, activeCamera, aspectRatio, devices, meta, _boardUid, updateWorldEnvironment, attachments, undoGroupStart, undoGroupEnd, orthoCamera, camera, setCamera, selectedAttachable, updateObjects, deleteObjects, cameraShots, _cameras, animatedUpdate }) => {
    const scene = getScene()

    if (!scene) {
      return null
    }
    // const modelCacheDispatch = useContext(CacheContext)

    const [shouldRaf, setShouldRaf] = useState(true)

    let largeRenderer = useRef(null)
    let largeRendererEffect = useRef(null)
    let smallRenderer = useRef(null)
    let smallRendererEffect = useRef(null)
    let animator = useRef(null)
    let animatorId = useRef(null)
    let [canvasInFocus, setCanvasInFocus] = useState("None")

    let cameraControlsView = useRef(null)

    let bonesHelper = useRef(null)
    let lightHelper = useRef(null)

    let ikHelper = useRef(null)
    let sceneChildren = scene ? scene.children.length : 0
    const dropingPlaces = useMemo(() => {
      if(!scene) return
      return scene.children.filter(o =>
        o.userData.type === 'object' ||
        o.userData.type === 'character' ||
        o.userData.type === 'ground')
    }, [sceneChildren])

    useEffect(() => {
      KeyCommandsSingleton.getInstance().addIPCKeyCommand({key: "shot-generator:object:drop", value:
      onCommandDrop})
      return () => {
        KeyCommandsSingleton.getInstance().removeIPCKeyCommand({key: "shot-generator:object:drop"})
      } 
    }, [sceneObjects, selections, scene])

    const onCommandDrop = useCallback(() => {
      let changes = {}
      for( let i = 0; i < selections.length; i++ ) {
        let selection = scene.children.find( child => child.userData.id === selections[i] )
        if( selection.userData.type === "object" ) {
          dropObject( selection, dropingPlaces )
          let pos = selection.position
          changes[ selections[i] ] = { x: pos.x, y: pos.z, z: pos.y }
        } else if ( selection.userData.type === "character" ) {
          dropCharacter( selection, dropingPlaces )
          let pos = selection.position
          changes[ selections[i] ] = { x: pos.x, y: pos.z, z: pos.y }
        }
      }
      updateObjects(changes)
    }, [selections, sceneObjects, scene])

    const changeCameraFocalLength = useCallback(() => {
      let cameraState = _cameras.find(camera => camera.id === activeCamera)

      let mms = [12, 16, 18, 22, 24, 35, 50, 85, 100, 120, 200, 300, 500]

      let camera = scene.children.find(child => child.userData.id === activeCamera)
      let fakeCamera = camera.clone() // TODO reuse a single object
      let fovs = mms.map(mm => {
        fakeCamera.setFocalLength(mm)
        return fakeCamera.fov
      }).sort((a, b) => a - b)
      fakeCamera = null

      let index = indexIn(fovs, cameraState.fov)
      let fov = {
        "[": fovs[Math.min(index + 1, fovs.length)],
        "]": fovs[Math.max(index - 1, 0)]
      }[event.key]

      updateObject(activeCamera, { fov })
    }, [_cameras, activeCamera])

    useEffect(() => {
      KeyCommandsSingleton.getInstance().addKeyCommand({
        key: "changeCameraFOV",
        keyCustomCheck: (event) => event.key === "[" || event.key === "]",
        value: changeCameraFocalLength
      })
      return () => KeyCommandsSingleton.getInstance().removeKeyCommand({ key: "changeCameraFOV" })
    }, [_cameras, activeCamera])


    let clock = useRef(new THREE.Clock())
    useMemo(() => {
      console.log('new SceneManager')

      scene.background = new THREE.Color(world.backgroundColor)
      //scene.add(new THREE.AmbientLight(0x161616, 1))

      // let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1)
      // directionalLight.position.set(0, 1, 3)
      // scene.add(directionalLight)

      // initialize orthoCamera
      orthoCamera.current.position.y = 900
      orthoCamera.current.rotation.x = -Math.PI / 2
      orthoCamera.current.layers.enable(2)
    }, [])

  
    const selectionsRef = useRef(selections)
    const selectedCharacters = useRef([])
    
    useEffect(() => {
      selectionsRef.current = selections;
  
      selectedCharacters.current = selections.filter((id) => {
        return (sceneObjects[id] && sceneObjects[id].type === "character")
      })
    }, [selections])

    useEffect(() => {
      let selected = scene.children.find((obj) => selectedCharacters.current.indexOf(obj.userData.id) >= 0)
      let characters = scene.children.filter((obj) => obj.userData.type === "character")
      
      if (characters.length) {
        let keys = Object.keys(cameraShots)
        for(let i = 0; i < keys.length; i++ ) {
          let key = keys[i]
          let camera = scene.children.find((object) => object.userData.id === key)
          setShot({
            camera,
            characters,
            selected,
            updateObject,
            shotSize: cameraShots[key].size,
            shotAngle: cameraShots[key].angle
          })
        }
      }
    }, [cameraShots])

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
      
      let sgIkHelper = SGIkHelper.getInstance(null, scene, camera, largeRenderer.current.domElement)
      ikHelper.current = sgIkHelper
      const updateCharacterRotation = (name, rotation) => { updateCharacterSkeleton({
        id: sgIkHelper.characterObject.userData.id,
        name : name,
        rotation:
        {
          x : rotation.x,
          y : rotation.y,
          z : rotation.z,
        }
      } )}

      const updateSkeleton = (skeleton) => { updateCharacterIkSkeleton({
        id: sgIkHelper.characterObject.userData.id,
        skeleton: skeleton
      } )}

      const updateCharacterPos = ({ x, y, z}) => updateObject(
        sgIkHelper.characterObject.userData.id,
        { x, y: z, z: y }
      )

      const updatePoleTarget = (poleTargets) => updateCharacterPoleTargets({
          id: sgIkHelper.characterObject.userData.id,
          poleTargets: poleTargets
        }
      )

      sgIkHelper.setUpdate(
        updateCharacterRotation,
        updateSkeleton,
        updateCharacterPos,
        updatePoleTarget,
        updateObjects
      )
    }, [])

    const setOutlineEffectParams = (type, params) => {
      if (type === 'large') {
        largeRendererEffect.current = new THREE.OutlineEffect(
          largeRenderer.current,
          {
            defaultThickness: 0.008,
            ...params
          }
        )
      }
      if (type === 'small') {
        smallRendererEffect.current = new THREE.OutlineEffect(
          smallRenderer.current,
          {
            defaultThickness: 0.02,
            defaultAlpha: 0.5,
            defaultColor: [0.4, 0.4, 0.4],
            ignoreMaterial: true,
            ...params
          }
        )
      }
    }

    useMemo(() => {
      largeRenderer.current = new THREE.WebGLRenderer({
        canvas: largeCanvasRef.current,
        antialias: true
      })
      // largeRenderer.current.setSize(
      //   largeCanvasSize.width,
      //   largeCanvasSize.height
      // )
      setOutlineEffectParams('large')

      smallRenderer.current = new THREE.WebGLRenderer({
        canvas: smallCanvasRef.current,
        antialias: true
      })
      smallRenderer.current.setSize(
        300,
        300,
      )
      setOutlineEffectParams('small')
    }, [])
  
    const autofitOrtho = useCallback(() => {
      let minMax = [9999,-9999,9999,-9999]
        
      // go through all appropriate objects and get the min max
      let numVisible = 0
      for (let child of scene.children) {
        if (
            child.userData &&
            child.userData.type === 'object' ||
            child.userData.type === 'character' ||
            child.userData.type === 'light' ||
            child.userData.type === 'volume' ||
            child.userData.type === 'image' ||
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
        let padding = (mWidth / rs)-mHeight
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
    }, [scene, mainViewCamera, orthoCamera])

    const onPointerMove = (event) => {
      if(smallCanvasRef.current && largeCanvasRef.current) {
        const smallRect = smallCanvasRef.current.getBoundingClientRect()
        const largerRect = largeCanvasRef.current.getBoundingClientRect()
        if(smallRect.left <= event.clientX && smallRect.top <= event.clientY
          && smallRect.right >= event.clientX && smallRect.bottom >= event.clientY) {
            setCanvasInFocus ("Small")
        } else if(largerRect.left <= event.clientX && largerRect.top <= event.clientY
          && largerRect.right >= event.clientX && largerRect.bottom >= event.clientY) {
            setCanvasInFocus ("Large")
        } else {
          setCanvasInFocus ("None")
        }
      }
    }

    useLayoutEffect(() => {
      document.addEventListener("pointermove", onPointerMove)
      return () => {
        document.removeEventListener("pointermove", onPointerMove)
      }
    }, [onPointerMove])
  
    // autofit ortho camera for scene
    useEffect(autofitOrtho, [sceneObjects, mainViewCamera, aspectRatio])

    // resize the renderers (large and small)
    useMemo(() => {
      // how wide is the canvas which will render the large view?
      let width = Math.ceil(largeCanvasSize.width)
      // assign a target height, based on scene aspect ratio
      let height = Math.ceil(width / aspectRatio)
      
      if (height > largeCanvasSize.height) {
        height = Math.ceil(largeCanvasSize.height)
        width = Math.ceil(height * aspectRatio)
      }

      // resize the renderers
      if (mainViewCamera === 'live') {
        // ortho camera is small
        smallRenderer.current.setSize(300, 300)
        setOutlineEffectParams(
          'small',
          {
            defaultThickness: 0.02,
            ignoreMaterial: true,
            defaultColor: [0.4, 0.4, 0.4]
          }
        )

        // perspective camera is large
        largeRenderer.current.setSize(width, height)
        setOutlineEffectParams(
          'large',
          {
            defaultThickness: 0.008,
            ignoreMaterial: false,
            defaultColor: [0, 0, 0]
          }
        )

      } else {
        // ortho camera is large
        largeRenderer.current.setSize(width, height)
        setOutlineEffectParams(
          'large',
          {
            defaultThickness: 0.013,
            ignoreMaterial: true,
            defaultColor: [ 0.4, 0.4, 0.4 ]
          }
        )
        // perspective camera is small
        smallRenderer.current.setSize(
          Math.floor(300),
          Math.floor(300 / aspectRatio)
        )
        setOutlineEffectParams(
          'small',
          {
            defaultThickness: 0.008,
            ignoreMaterial: false,
            defaultColor: [0, 0, 0]
          }
        )
      }
    }, [largeCanvasSize, mainViewCamera, aspectRatio])

    useEffect(() => {
      setCamera(scene.children.find(o => o.userData.id === activeCamera))
    }, [activeCamera])

    useEffect(() => {
      if (camera) {
        console.log('camera changed')
        
        const onCameraUpdate = ({active, object}) => {
          if (camera.userData.locked) {
            return false
          }
  
          if (active) {
            camera.position.x = object.x
            camera.position.y = object.z
            camera.position.z = object.y
            camera.rotation.x = 0
            camera.rotation.z = 0
            camera.rotation.y = object.rotation
            camera.rotateX(object.tilt)
            camera.rotateZ(object.roll)
            camera.fov = object.fov
            camera.updateProjectionMatrix()
  
            if (camera.updateIcon) {
              camera.updateIcon()
            }
          } else {
            //Update camera state if dragging was ended
            updateObject(camera.userData.id, {
              x: object.x,
              y: object.y,
              z: object.z,
              rotation: object.rotation,
              tilt: object.tilt,
              fov: object.fov
            })
          }
        }

        // state of the active camera
        let cameraState = Object.values(sceneObjects).find(o => o.id === camera.userData.id)
        if (!cameraControlsView.current) {
          console.log('new CameraControls')
          cameraControlsView.current = new CameraControls(
            CameraControls.objectFromCameraState(cameraState),
            largeCanvasRef.current,
            {
              undoGroupStart,
              undoGroupEnd,
              onChange: onCameraUpdate
            }
          )
        }

        animator.current = () => {
          //if (stats) { stats.begin() }
          if (scene && camera) {
            updateCharacterIk(scene);
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
          //if (stats) { stats.end() }
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

    useMemo(() => {
      if (camera && cameraControlsView.current) {
        if (mainViewCamera === 'ortho') {
          cameraControlsView.current.enabled = false
        }
      }
    }, [camera, cameraControlsView.current, mainViewCamera])

    const onDragStart = useCallback(() => {
      if (cameraControlsView.current) {
        cameraControlsView.current.reset()
        cameraControlsView.current.enabled = false
      }
    }, [cameraControlsView.current])

    const onDragEnd = useCallback(() => {
      if (cameraControlsView.current) {
        cameraControlsView.current.reset()
        cameraControlsView.current.enabled = true
      }
    }, [cameraControlsView.current])

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
           // console.log("Character")
            return [
              Character, {
                key: props.id,
                scene,

                remoteInput,
                isSelected: selections.includes(props.id),
                selectedBone,

                camera,

                updateCharacterSkeleton,
                updateCharacterIkSkeleton,
                updateObject,

                devices,

                // HACK force reset skeleton pose on Board UUID change
                boardUid: _boardUid,

                storyboarderFilePath: meta.storyboarderFilePath,
                loaded: props.loaded ? props.loaded : false,
                modelData: attachments[modelCacheKey] && attachments[modelCacheKey].value,
                largeRenderer,
                deleteObjects,
                updateObjects:updateObjects,
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

          case 'image':
            return [
              Image, {
                key: props.id,
                scene,
                isSelected: selections.includes(props.id),

                updateObject,

                storyboarderFilePath: meta.storyboarderFilePath,
                imageAttachmentIds: props.imageAttachmentIds,
                ...props
              }
            ]
          case 'attachable':
              try {
                modelCacheKey = ModelLoader.getFilepathForModel({ model: props.model, type: props.type }, { storyboarderFilePath: meta.storyboarderFilePath })
              } catch (err) {
                // console.log('migrating from absolute path')
              }
            return [
              Attachable, {
                scene, 
                key: props.id,
                updateObject,
                storyboarderFilePath: meta.storyboarderFilePath,
                sceneObject: sceneObjects[props.attachToId],
                loaded: props.loaded ? props.loaded : false,
                modelData: attachments[modelCacheKey] && attachments[modelCacheKey].value,
                camera: camera,
                largeRenderer: largeRenderer,
                isSelected: selectedAttachable === null ? false : selectedAttachable === props.id ? true : false,
                deleteObjects,
                ...props
              }
            ]
          case 'group':
            return [
              Group, {
                key: props.id,
                scene,
                isSelected: selections.includes(props.id),
            
                updateObject,
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
    const getFocusedSelectionManager = () => {
      if(canvasInFocus === "Large") {
        return [SelectionManager, {
          key: 'selection-manager-large',
          camera: mainViewCamera === 'live' ? camera : orthoCamera.current,
          el: largeCanvasRef.current,
          selectOnPointerDown: mainViewCamera !== 'live',
          useIcons: mainViewCamera !== 'live',
          gl: largeRenderer.current,
          onDrag: autofitOrtho,
          onDragStart,
          onDragEnd
        }]
      } else if (canvasInFocus === "Small") {
       return [SelectionManager, {
          key: 'selection-manager-small',
          camera: mainViewCamera === 'live' ? orthoCamera.current : camera,
          el: smallCanvasRef.current,
          selectOnPointerDown: mainViewCamera === 'live',
          useIcons: mainViewCamera === 'live',
          gl: smallRenderer.current,
          updateObject:updateObject,
          onDrag: autofitOrtho,
          onDragStart,
          onDragEnd
        }]
      } 

    }
    const focusedSelectionManager = getFocusedSelectionManager()
    // TODO Scene parent object??
    return [
      canvasInFocus !== "None" && focusedSelectionManager && h(focusedSelectionManager),
      [
        worldComponent,
        ...components
      ].map(c => h(c))
    ]
  }
)

function updateCharacterIk(scene)
{
}

export default SceneManager
