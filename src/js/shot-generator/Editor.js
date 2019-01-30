const THREE = require('three')

const { ipcRenderer, remote } = require('electron')
const { dialog } = remote
const fs = require('fs')
const path = require('path')

const React = require('react')
const { useState, useEffect, useRef, useContext } = React
const { Provider, connect } = require('react-redux')
const ReactDOM = require('react-dom')
const Stats = require('stats.js')
const { VariableSizeList } = require('react-window')
const classNames = require('classnames')
const prompt = require('electron-prompt')

const { createSelector } = require('reselect')

//const h = require('../h')
//const useComponentSize = require('../use-component-size')
const h = require('../utils/h')
const useComponentSize = require('../hooks/use-component-size')

const {
  selectObject,
  createObject,
  updateObject,
  deleteObject,

  duplicateObject,

  selectBone,
  setMainViewCamera,
  loadScene,
  saveScene,
  updateCharacterSkeleton,
  setActiveCamera,
  resetScene,
  createScenePreset,
  updateScenePreset,
  deleteScenePreset,

  createCharacterPreset,

  createPosePreset,
  updatePosePreset,
  deletePosePreset,

  updateWorld,
  updateWorldRoom,
  updateWorldEnvironment
//} = require('../state')
} = require('../shared/reducers/shot-generator')

const { Machine } = require('xstate')
//const useMachine = require('../useMachine')
const useMachine = require('../hooks/use-machine')

const CameraControls = require('./CameraControls')
const DragControls = require('./DragControls')

const Character = require('./Character')
const SpotLight = require('./SpotLight')

const SceneObject = require('./SceneObject')

const BonesHelper = require('./BonesHelper')

const presetsStorage = require('../shared/store/presetsStorage')
//const presetsStorage = require('../presetsStorage')

const WorldObject = require('./World')

const ModelLoader = require('../services/model-loader')

const NumberSlider = require('./NumberSlider')
const NumberSliderTransform = {
  degrees: (prev, delta, { min, max, step, fine }) => {
    // inc/dec
    let value = prev + (delta * (step * (fine ? 0.01 : 1)))
    // mod
    if (value > 180) { return value - 360 }
    if (value < -180) { return value + 360 }
    return value
  }
}
const NumberSliderFormatter = {
  degrees: value => Math.round(value).toString() + '°',
  percent: value => Math.round(value).toString() + '%',
}

const ModelSelect = require('./ModelSelect')

require('../vendor/OutlineEffect.js')


window.THREE = THREE

const draggables = (sceneObjects, scene) =>
  //scene.children.filter(o => o.userData.type === 'object' || o instanceof BoundingBoxHelper)
  scene.children.filter(o => o.userData.type === 'object' || o.userData.type === 'character' || o.userData.type === 'light' )

const characters = ( scene ) =>
  scene.children.filter(o => o.userData.type === 'character')

const animatedUpdate = (fn) => (dispatch, getState) => fn(dispatch, getState())

const metersAsFeetAndInches = meters => {
  let heightInInches = meters * 39.3701
  let heightFeet = Math.floor(heightInInches / 12)
  let heightInches = Math.floor(heightInInches % 12)
  return [heightFeet, heightInches]
}

const feetAndInchesAsString = (feet, inches) => `${feet}′${inches}″`

const shortId = id => id.toString().substr(0, 7).toLowerCase()

const preventDefault = (fn, ...args) => e => {
  e.preventDefault()
  fn(e, ...args)
}

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

const SceneContext = React.createContext()

const SceneManager = connect(
  state => ({
    world: state.world,
    sceneObjects: state.sceneObjects,
    remoteInput: state.input,
    selection: state.selection,
    selectedBone: state.selectedBone,
    mainViewCamera: state.mainViewCamera,
    activeCamera: state.activeCamera,
    aspectRatio: state.aspectRatio,
    devices:state.devices
  }),
  {
    updateObject,
    selectObject,
    animatedUpdate,
    selectBone,
    updateCharacterSkeleton
  }
)(
  ({ world, sceneObjects, updateObject, selectObject, remoteInput, largeCanvasRef, smallCanvasRef, selection, selectedBone, machineState, transition, animatedUpdate, selectBone, mainViewCamera, updateCharacterSkeleton, largeCanvasSize, activeCamera, aspectRatio, devices }) => {
    const { scene } = useContext(SceneContext)
    let [camera, setCamera] = useState(null)

    let largeRenderer = useRef(null)
    let largeRendererEffect = useRef(null)
    let smallRenderer = useRef(null)
    let animator = useRef(null)
    let animatorId = useRef(null)

    let cameraControlsView = useRef(null)
    let dragControlsView = useRef(null)
    let orthoDragControlsView = useRef(null)
    let bonesHelper = useRef(null)
    let lightHelper = useRef(null)

    let clock = useRef(new THREE.Clock())

    let orthoCamera = useRef(new THREE.OrthographicCamera( -4, 4, 4, -4, 0, 1000 ))

    let cameraHelper = useRef(null)

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
      largeRenderer.current = new THREE.WebGLRenderer({
        canvas: largeCanvasRef.current,
        antialias: true
      })
      // largeRenderer.current.setSize(
      //   largeCanvasSize.width,
      //   largeCanvasSize.height
      // )

      largeRendererEffect.current = new THREE.OutlineEffect( largeRenderer.current )

      smallRenderer.current = new THREE.WebGLRenderer({
        canvas: smallCanvasRef.current,
        antialias: true
      })
      smallRenderer.current.setSize(
        300,
        300,
      )
    }, [])

    // resize the renderers (large and small)
    // FIXME this is running _after_ the animation frame, causing a visible jump
    useEffect(() => {
      // how wide is the canvas which will render the large view?
      let width = Math.ceil(largeCanvasSize.width)
      // assign a target height, based on scene aspect ratio
      let height = Math.ceil(width / aspectRatio)

      let minMax = [9999,-9999,9999,-9999]

      // go through all appropriate opbjects and get the min max
      for (child of scene.children) {
        if (
          child.userData &&
          child.userData.type === 'object' ||
          child.userData.type === 'character' ||
          child.userData.type === 'light' ||
          child instanceof THREE.PerspectiveCamera
        ) {
          minMax[0] = Math.min(child.position.x, minMax[0])
          minMax[1] = Math.max(child.position.x, minMax[1])
          minMax[2] = Math.min(child.position.z, minMax[2])
          minMax[3] = Math.max(child.position.z, minMax[3])
        }
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

      // resize the renderers
      if (mainViewCamera === 'live') {
        // perspective camera is large
        largeRenderer.current.setSize(width, height)
        // ortho camera is small
        smallRenderer.current.setSize(300, 300)
      } else {
        // ortho camera is large
        largeRenderer.current.setSize(width, height)
        // perspective camera is small
        smallRenderer.current.setSize(
          Math.floor(300),
          Math.floor(300 / aspectRatio)
        )
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
          //console.log(cameraState)
          console.log('new CameraControls')
          cameraControlsView.current = new CameraControls(
            {},
            largeCanvasRef.current
          )
        }

        if (!dragControlsView.current) {
          console.log('new DragControls')
          dragControlsView.current = new DragControls(
            draggables(sceneObjects, scene),
            camera,
            largeCanvasRef.current,
            selectObject,
            updateObject,
            selectBone
          )
          dragControlsView.current.addEventListener('pointerdown', event => {
            transition('TYPING_EXIT')
          })
          dragControlsView.current.addEventListener(
            'dragstart',
            function ( event ) {
              transition('EDITING_ENTER')
            }.bind(this)
          )
          dragControlsView.current.addEventListener( 'dragend', function ( event ) {
            transition('EDITING_EXIT')
          }.bind(this) )
        }

        if (!orthoDragControlsView.current) {
          orthoDragControlsView.current = new DragControls(
            draggables(sceneObjects, scene),
            orthoCamera.current,
            smallCanvasRef.current,
            selectObject,
            updateObject,
            selectBone
          )
          orthoDragControlsView.current.addEventListener( 'dragstart', function ( event ) {
            transition('EDITING_ENTER')
          }.bind(this) )
          orthoDragControlsView.current.addEventListener( 'dragend', function ( event ) {
            transition('EDITING_EXIT')
          }.bind(this) )
        }

        cameraHelper.current = new THREE.CameraHelper(camera)
        scene.add(cameraHelper.current)

        animator.current = () => {
          if (stats) { stats.begin() }
          if (scene && camera) {

            animatedUpdate((dispatch, state) => {
              let cameraForSmall = state.mainViewCamera === 'ortho' ? camera : orthoCamera.current
              let cameraForLarge = state.mainViewCamera === 'live' ? camera : orthoCamera.current

              dragControlsView.current.setCamera(cameraForLarge)
              orthoDragControlsView.current.setCamera(cameraForSmall)

              if (cameraControlsView.current && cameraControlsView.current.enabled) {
                let cameraState = Object.values(state.sceneObjects).find(o => o.id === camera.userData.id)

                if (!cameraState) {
                  // FIXME
                  // when loading a new scene, rAF might run with a state reference
                  // should reset reset animator.current when loading
                  // for now, just prevent attempting to render when in conflicting state
                  console.warn('prevented render with missing camera state')
                  return
                }

                cameraControlsView.current.object = {
                  x: cameraState.x,
                  y: cameraState.y,
                  z: cameraState.z,
                  rotation: cameraState.rotation,
                  tilt: cameraState.tilt,
                  fov: cameraState.fov
                }

                // step
                cameraControlsView.current.update( clock.current.getDelta(), state )
                dragControlsView.current.update( clock.current.getDelta(), state )

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

              cameraHelper.current.visible = state.mainViewCamera === 'live'
                ? false
                : true

              if (state.mainViewCamera === 'live') {
                largeRendererEffect.current.render(scene, cameraForLarge)
              } else {
                largeRenderer.current.render(scene, cameraForLarge)
              }

              cameraHelper.current.update()
              cameraHelper.current.visible = state.mainViewCamera === 'live'
                ? true
                : false
              smallRenderer.current.render(scene, cameraForSmall)
            })
          }
          if (stats) { stats.end() }
          animatorId.current = requestAnimationFrame(animator.current)
        }
        animatorId.current = requestAnimationFrame(animator.current)
      }

      return function cleanup () {
        console.log('cameraControls setter cleanup')

        cancelAnimationFrame(animatorId.current)
        animator.current = () => {}

        scene.remove(cameraHelper.current)
        cameraHelper.current = null

        if (cameraControlsView.current) {
          // remove camera controls event listeners and null the reference
          cameraControlsView.current.dispose()
          cameraControlsView.current = null
        }
      }
    }, [camera])

    // see code in rAF
    // useEffect(() => {}, [mainViewCamera])

    useEffect(() => {
      // TODO update sceneObjects[character.id].loaded when loaded

      let sceneObject = null
      let child = null

      if (selection != null) {
        child = scene.children.find(o => o.userData.id === selection)
        sceneObject = sceneObjects[selection]
        //if light - add helper
        if (sceneObject.type === 'light') {
          if (lightHelper.current !== child)
          {
            scene.remove(lightHelper.current)
            lightHelper.current = child.helper
            scene.add(lightHelper.current)
          }
        } else {
          if (lightHelper.current)
          {
            scene.remove(lightHelper.current)
            lightHelper.current = null
          }
        }

        //if character
        if (child && ((child.children[0] && child.children[0].skeleton) || (child.children[1] && child.children[1].skeleton)) && sceneObject.visible) {
          //console.log('child: ', child)
          let skel = (child.children[0] instanceof THREE.Mesh) ? child.children[0] : child.children[1]

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



      if (dragControlsView.current) {
        dragControlsView.current.setBones(bonesHelper.current)
        dragControlsView.current.setSelected(child)
      }
      if (orthoDragControlsView.current) {
        orthoDragControlsView.current.setBones(bonesHelper.current)
        orthoDragControlsView.current.setSelected(child)
      }
    }, [selection, sceneObjects])

    useEffect(() => {
      if (dragControlsView.current) {
        // TODO read-only version?
        dragControlsView.current.setObjects(draggables(sceneObjects, scene))

        // TODO update if there are changes to the camera(s) in the scene
        //
        // let cameraState = Object.values(sceneObjects).find(o => o.type === 'camera')
        // cameraControlsView.current.object = JSON.parse(JSON.stringify(cameraState))
      }
    }, [sceneObjects, camera])

    useEffect(() => {
      if (orthoDragControlsView.current) {
        orthoDragControlsView.current.setObjects(draggables(sceneObjects, scene))
      }
    }, [sceneObjects, orthoCamera])

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

    // console.log('SceneManager render', sceneObjects)

    const components = Object.values(sceneObjects).map(props => {
        switch (props.type) {
          case 'object':
            return [
              SceneObject, {
                key: props.id,
                scene,

                isSelected: props.id === selection,

                loaded: props.loaded ? props.loaded : false,
                updateObject,

                ...props
              }
            ]

          case 'character':
            return [
              Character, {
                key: props.id,
                scene,

                remoteInput,
                isSelected: selection === props.id,
                selectedBone,

                camera,

                updateCharacterSkeleton,
                updateObject,

                loaded: props.loaded ? props.loaded : false,
                devices, 
                ...props
              }
            ]

          case 'camera':
            return [
              Camera, {
                key: props.id,
                scene,

                setCamera,

                aspectRatio,

                ...props
              }
            ]

            case 'light':
              return [
                SpotLight, {
                  key: props.id,
                  scene,

                  ...props
                }
              ]

        }
    })

    const worldComponent = [WorldObject, { key: 'world', world, scene }]

    // TODO Scene parent object?
    return [
      [worldComponent, ...components].map(c => h(c))
    ]
  }
)

// const DebugObject = React.memo(({ id, type }) => {
//   useEffect(() => {
//     console.log(type, id, 'added')
//
//     return function cleanup () {
//       console.log(type, id, 'removed')
//     }
//   }, [])
//   console.log(type, id, 'render')
//
//   return null
// })



const Camera = React.memo(({ scene, id, type, setCamera, ...props }) => {
  let camera = useRef(
    new THREE.PerspectiveCamera(
    props.fov,
    props.aspectRatio,
    // near
    0.01,
    // far
    1000
  ))

  useEffect(() => {
    console.log(type, id, 'added')

    // TODO do we ever need these?  - we do at least some (aspectRatio breaks)
    // camera.current.position.x = props.x
    // camera.current.position.y = props.z
    // camera.current.position.z = props.y
    // camera.current.rotation.x = 0
    // camera.current.rotation.z = 0
    // camera.current.rotation.y = props.rotation
    // camera.current.rotateX(props.tilt)
    // camera.current.rotateZ(props.roll)
    // camera.current.userData.type = type
    // camera.current.userData.id = id
    camera.current.aspect = props.aspectRatio

    // camera.current.fov = props.fov
    // camera.current.updateProjectionMatrix()
    scene.add(camera.current)
    // setCamera(camera.current)

    // console.log(
    //   'focal length:',
    //   camera.current.getFocalLength(),
    //   'fov',
    //   camera.current.fov,
    //   'h',
    //   camera.current.getFilmHeight(),
    //   'gauge',
    //   camera.current.filmGauge,
    //   'aspect',
    //   camera.current.aspect
    // )

    return function cleanup () {
      console.log(type, id, 'removed')
      scene.remove(camera.current)
      // setCamera(null)
    }
  }, [])

  // console.log('updating camera from props')
  camera.current.position.x = props.x
  camera.current.position.y = props.z
  camera.current.position.z = props.y
  camera.current.rotation.x = 0
  camera.current.rotation.z = 0
  camera.current.rotation.y = props.rotation
  camera.current.rotateX(props.tilt)
  camera.current.rotateZ(props.roll)
  camera.current.userData.type = type
  camera.current.userData.id = id
  camera.current.aspect = props.aspectRatio

  camera.current.fov = props.fov
  camera.current.updateProjectionMatrix()

  return null
})

const WorldElement = React.memo(({ index, world, isSelected, selectObject, style = {} }) => {
  const onClick = () => {
    selectObject(null)
  }

  let className = classNames({
    'selected': isSelected,
    'zebra': index % 2
  })

  return h([
    'div.element', { className, style: { height: ELEMENT_HEIGHT, ...style } }, [
      [
        'a.title[href=#]',
        { onClick },
        ['span.type', 'Scene']
      ]
    ]
  ])
})

const ListItem = ({ index, style, isScrolling, data }) => {
  const { items, models, selection, selectObject, updateObject, deleteObject, activeCamera, setActiveCamera } = data

  const isWorld = index === 0

  const sceneObject = index === 0
    ? items[0]
    : items[index]

  // HACK this should be based directly on state.sceneObjects, or cached in the sceneObject data
  const number = items.filter(o => o.type === sceneObject.type).indexOf(sceneObject) + 1
  const capitalize = string => string.charAt(0).toUpperCase() + string.slice(1)
  const calculatedName = capitalize(`${sceneObject.type} ${number}`)

  return h(
    isWorld
    ? [
      WorldElement, {
        index,
        world: items[0],
        isSelected: selection == null,
        selectObject
      }
    ]
    : [
        Element, {
          index,
          style,
          sceneObject,
          calculatedName,
          isSelected: sceneObject.id === selection,
          isActive: sceneObject.type === 'camera' && sceneObject.id === activeCamera,
          allowDelete: (
            sceneObject.type != 'camera' ||
            sceneObject.type == 'camera' && activeCamera !== sceneObject.id
          ),
          onSelectObject: selectObject,
          onUpdateObject: updateObject,
          deleteObject,
          setActiveCamera
        }
      ]
  )
}

const Inspector = ({
  world,
  kind, data,
  models, updateObject, deleteObject,
  machineState, transition,
  selectedBone,
  selectBone,
  updateCharacterSkeleton,
  updateWorld,
  updateWorldRoom,
  updateWorldEnvironment,
  calculatedName
}) => {
  const { scene } = useContext(SceneContext)

  const ref = useRef()

  const onFocus = event => transition('TYPING_ENTER')
  const onBlur = event => transition('TYPING_EXIT')

  let sceneObject = data

  // try to exit typing if there is nothing to inspect
  useEffect(() => {
    if (!data) transition('TYPING_EXIT')
  }, [data])

  useEffect(() => {
    // automatically blur if typing mode was exited but a child of ours is focused
    if (!machineState.matches('typing')) {
      if (document.hasFocus()) {
        const el = document.activeElement
        if (ref.current.contains(el)) {
          el.blur()
        }
      }
    }
  }, [machineState])

  return h([
    'div#inspector',
    { ref, onFocus, onBlur },
    (kind && data)
      ? [
          InspectedElement, {
            sceneObject,
            models,
            updateObject,
            selectedBone: scene.getObjectByProperty('uuid', selectedBone),
            machineState,
            transition,
            selectBone,
            updateCharacterSkeleton,

            calculatedName
          }
        ]
      : [
        InspectedWorld, {
          world,

          transition,

          updateWorld,
          updateWorldRoom,
          updateWorldEnvironment
        }
      ]
  ])
}

const InspectedWorld = ({ world, transition, updateWorld, updateWorldRoom, updateWorldEnvironment }) => {
  const onGroundClick = event => {
    event.preventDefault()
    updateWorld({ ground: !world.ground })
  }

  return h([
    'div',
    ['h4', { style: { margin: 0 } }, 'Scene'],
    [
      'div', { style: { marginBottom: 12 }},

      [
        'div.row',
        { style: { alignItems: 'center', margin: '6px 0 3px 0' } }, [

          ['div', { style: { width: 50 } }, 'ground'],

          ['input', {
            type: 'checkbox',
            checked: world.ground,
            readOnly: true,
            style: {

            }
          }],

          ['label', {
            onClick: onGroundClick,
          }, [
            'span'
          ]]
        ]
      ],

      [NumberSlider,
        {
          label: 'bg color',
          value: world.backgroundColor / 0xFFFFFF,
          min: 0,
          max: 1,
          onSetValue: value => {
            // value is 0..1, scale to component value of 0x00...0xFF (0...255)
            let c = 0xFF * value
            // monochrome
            let backgroundColor = (c << 16) | (c << 8) | c
            updateWorld({ backgroundColor })
          }
        }
      ],

    ],

    [
      'div', { style: { marginBottom: 12 }},
      [
        ['h5', { style: { margin: 0 } }, 'Room'],

        [
          'div.row',
          { style: { alignItems: 'center', margin: '6px 0 3px 0' } }, [

            ['div', { style: { width: 50 } }, 'visible'],

            ['input', {
              type: 'checkbox',
              checked: world.room.visible,
              readOnly: true,
              style: {

              }
            }],

            ['label', {
              onClick: preventDefault(event => {
                updateWorldRoom({ visible: !world.room.visible })
              }),
            }, [
              'span'
            ]]
          ]
        ],

        ['div.column', [
          [NumberSlider, { label: 'width', value: world.room.width, min: 12, max: 250, onSetValue: value => updateWorldRoom({ width: value }) } ],
          [NumberSlider, { label: 'length', value: world.room.length, min: 10, max: 250, onSetValue: value => updateWorldRoom({ length: value }) } ],
          [NumberSlider, { label: 'height', value: world.room.height, min: 8, max: 40, onSetValue: value => updateWorldRoom({ height: value }) } ],
        ]]
      ]
    ],

    [
      'div', { style: { marginBottom: 12 }},
      [
        ['h5', { style: { margin: 0 } }, 'Environment'],

        [
          'div.row',
          { style: { alignItems: 'center', margin: '6px 0 3px 0' } }, [

            ['div', { style: { width: 50 } }, 'visible'],

            ['input', {
              type: 'checkbox',
              checked: world.environment.visible,
              readOnly: true,
              style: {

              }
            }],

            ['label', {
              onClick: preventDefault(event => {
                updateWorldEnvironment({ visible: !world.environment.visible })
              }),
            }, [
              'span'
            ]]
          ]
        ],

        ['div.row', [
          ['div', { style: { width: 50 } }, 'file'],
          ['div', [
            'a[href=#]',
            {
              onClick: event => {
                let filepaths = dialog.showOpenDialog(null, {})
                if (filepaths) {
                  let filepath = filepaths[0]
                  updateWorldEnvironment({ file: filepath })
                } else {
                  updateWorldEnvironment({ file: undefined })
                }
                // automatically blur to return keyboard control
                document.activeElement.blur()
                transition('TYPING_EXIT')
              },
              style: {
                fontStyle: 'italic',
                textDecoration: 'none',
                borderBottomWidth: '1px',
                borderBottomStyle: 'dashed'
              }
            },
            world.environment.file ? path.basename(world.environment.file) : '(none)'
          ]]
        ]],

        ['div.column', [
          [NumberSlider, { label: 'x', value: world.environment.x, min: -30, max: 30, onSetValue: value => updateWorldEnvironment({ x: value }) } ],
          [NumberSlider, { label: 'y', value: world.environment.y, min: -30, max: 30, onSetValue: value => updateWorldEnvironment({ y: value }) } ],
          [NumberSlider, { label: 'z', value: world.environment.z, min: -30, max: 30, onSetValue: value => updateWorldEnvironment({ z: value }) } ],
        ]],

        ['div.row', [
          [
            NumberSlider, {
              label: 'scale',
              value: world.environment.scale,
              min: 0.001,
              max: 2,
              onSetValue: value => {
                updateWorldEnvironment({ scale: value })
              }
            }
          ]
        ]],

        ['div',
          [NumberSlider, {
            label: 'rotation',
            min: -180,
            max: 180,
            step: 1,
            value: THREE.Math.radToDeg(world.environment.rotation),
            onSetValue: rotation => {
              updateWorldEnvironment({ rotation: THREE.Math.degToRad(rotation) })
            },
            transform: NumberSliderTransform.degrees,
            formatter: NumberSliderFormatter.degrees
          }]
        ]

      ]
    ],

    [
      'div', { style: { marginBottom: 12 }},
      [
        ['h5', { style: { margin: 0 } }, 'Ambient light'],

        [NumberSlider, { label: 'intensity', value: world.ambient.intensity, min: 0, max: 1, onSetValue: value => updateWorldEnvironment({ intensity: value }) } ],
      ]
    ],

    [
      'div', { style: { marginBottom: 12 }},
      [
        ['h5', { style: { margin: 0 } }, 'Directional light'],

        [NumberSlider, { label: 'intensity', value: world.directional.intensity, min: 0, max: 1, onSetValue: value => updateWorldEnvironment({ intensityDirectional: value }) } ],
        ['div',
          [NumberSlider, {
            label: 'rotation',
            min: -Math.PI,
            max: Math.PI,
            step: Math.PI/180,
            value: world.directional.rotation,
            onSetValue: rotationDirectional => {
              updateWorldEnvironment({ rotationDirectional })
            },
            transform: NumberSliderTransform.radians,
            formatter: NumberSliderFormatter.radToDeg
          }]
        ],
        ['div',
          [NumberSlider, {
            label: 'tilt',
            min: -Math.PI,
            max: Math.PI,
            step: Math.PI/180,
            value: world.directional.tilt,
            onSetValue: tiltDirectional => {
              updateWorldEnvironment({ tiltDirectional })
            },
            transform: NumberSliderTransform.radians,
            formatter: NumberSliderFormatter.radToDeg
          }]
        ]
      ]
    ]
  ])
}

const RemoteInputView = ({ remoteInput }) => {
  let input = remoteInput

  let accel = input.accel.map(x => x.toFixed())
  let mag = input.mag.map(x => x.toFixed())
  let sensor = input.sensor.map(x => x.toFixed(2))
  let down = (input.down ? 'Y' : 'N')

  return h(
    ['div#remoteInputView',
      ['div',
        'input',
        ['div', 'accel: ' + accel ],
        ['div', 'mag: ' +  mag],
        ['div', 'sensor: ' + sensor ],
        ['div', 'down: ' + down ]
      ]
    ],
  )
}

const ElementsPanel = connect(
  // what changes should we watch for to re-render?
  state => ({
    world: state.world,
    sceneObjects: state.sceneObjects,
    selection: state.selection,
    selectedBone: state.selectedBone,
    models: state.models,
    activeCamera: state.activeCamera
  }),
  // what actions can we dispatch?
  {
    selectObject,
    updateObject,
    deleteObject,
    setActiveCamera,
    selectBone,
    updateCharacterSkeleton,
    updateWorld,
    updateWorldRoom,
    updateWorldEnvironment
  }
)(
  React.memo(({ world, sceneObjects, models, selection, selectObject, updateObject, deleteObject, selectedBone, machineState, transition, activeCamera, setActiveCamera, selectBone, updateCharacterSkeleton, updateWorld, updateWorldRoom, updateWorldEnvironment }) => {
    let ref = useRef(null)
    let size = useComponentSize(ref)

    let listRef = useRef(null)

    // TODO momoized selector
    // group by type
    let types = Object
     .entries(sceneObjects)
     .reduce((o, [ k, v ]) => {
       o[v.type] = o[v.type] || {}
       o[v.type][k.toString()] = v
       return o
    }, {})

    let sceneObjectsSorted = {
      ...types.camera,
      ...types.character,
      ...types.object,
      ...types.light
    }

    let items = [
      world,
      ...Object.values(sceneObjectsSorted)
    ]

    const ItemsList = size.width && React.createElement(
      VariableSizeList,
      {
        ref: listRef,
        height: size.height,
        itemCount: items.length,
        itemSize: index => ELEMENT_HEIGHT,
        width: size.width,
        itemData: {
          items,

          models,
          selection,
          selectObject,
          updateObject,
          deleteObject,
          activeCamera,
          setActiveCamera
        }
      },
      ListItem
    )

    useEffect(() => {
      let arr = Object.values(sceneObjectsSorted)
      let selected = arr.find(o => o.id === selection)
      let index = arr.indexOf(selected)
      if (index > -1) {
        // item 0 is always the world item
        // so add 1 to index for actual item
        listRef.current.scrollToItem(index + 1)
      }
    }, [selection])

    let kind = sceneObjects[selection] && sceneObjects[selection].type
    let data = sceneObjects[selection]

    // HACK this should be based directly on state.sceneObjects, or cached in the sceneObject data
    let calculatedName
    let sceneObject = sceneObjects[selection]
    if (sceneObject) {
      const number = Object.values(sceneObjects).filter(o => o.type === sceneObject.type).indexOf(sceneObject) + 1
      const capitalize = string => string.charAt(0).toUpperCase() + string.slice(1)
      calculatedName = capitalize(`${sceneObject.type} ${number}`)
    }

    return React.createElement(
      'div', { style: { flex: 1, display: 'flex', flexDirection: 'column' }},
        React.createElement(
          'div', { ref, id: 'listing' },
          size.width
            ? ItemsList
            : null
        ),
        h(
          [Inspector, {
            world,

            kind,
            data,

            models, updateObject,

            machineState, transition,

            selectedBone, selectBone,

            updateCharacterSkeleton,

            updateWorld,
            updateWorldRoom,
            updateWorldEnvironment,

            calculatedName
          }]
        )
      )
  }
))

const LabelInput = ({ label, setLabel, onFocus, onBlur }) => {
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)

  const onStartEditingClick = event => {
    setEditing(true)
  }

  const onSetLabelClick = event => {
    let value = ref.current.value
    if (value != null && value.length) {
      setLabel(value)
      setEditing(false)
    } else {
      setLabel(null)
      setEditing(false)
    }
    onBlur()
  }

  useEffect(() => {
    if (ref.current) {
      ref.current.focus()
      ref.current.select()
    }
  }, [editing, ref.current])

  return h(
    editing
      ? [
          'form',
          {
            onFocus,
            onBlur,

            style: {
              margin: '6px 0 12px 0'
            },
            onSubmit: preventDefault(onSetLabelClick),
          },
          [
            'input',
            {
              ref,
              style: {
                padding: 6
              },
              defaultValue: label
            }
          ],
          [
            'button',
            {
              style: {
                fontSize: 14,
                padding: 6,
                margin: '0 0 0 6px'
              }
            },
            'set'
          ]
        ]
      : [
          'a[href=#]',
          {
            onClick: preventDefault(onStartEditingClick),
            style: {
              display: 'inline-block',
              margin: '6px 0 9px 0',
              fontStyle: 'italic',
              textDecoration: 'none',
              borderBottomWidth: '1px',
              borderBottomStyle: 'dashed'
            }
          },
          label
        ]
  )
}

const saveCharacterPresets = state => presetsStorage.saveCharacterPresets({ characters: state.presets.characters })
const CharacterPresetsEditor = connect(
  state => ({
    characterPresets: state.presets.characters,
    models: state.models
  }),
  {
    updateObject,
    selectCharacterPreset: (id, characterPresetId, preset) => (dispatch, getState) => {
      let state = getState()
      dispatch(updateObject(id, {
        // set characterPresetId
        characterPresetId,

        // apply preset values to character model
        height: preset.state.height,
        //height: state.models[preset.state.model].baseHeight,
        model: preset.state.model,
        // gender: 'female',
        // age: 'adult'

        headScale: preset.state.headScale,

        morphTargets: {
          mesomorphic: preset.state.morphTargets.mesomorphic,
          ectomorphic: preset.state.morphTargets.ectomorphic,
          endomorphic: preset.state.morphTargets.endomorphic
        },

        name: preset.state.name
      }))
    },
    createCharacterPreset: ({ id, name, sceneObject }) => (dispatch, getState) => {
      // add the character data to a named preset
      let preset = {
        id,
        name,
        state: {
          height: sceneObject.height,
          //height: sceneObject.model.originalHeight,

          model: sceneObject.model,
          // gender: 'female',
          // age: 'adult'

          headScale: sceneObject.headScale,

          morphTargets: {
            mesomorphic: sceneObject.morphTargets.mesomorphic,
            ectomorphic: sceneObject.morphTargets.ectomorphic,
            endomorphic: sceneObject.morphTargets.endomorphic
          },

          name: sceneObject.name
        }
      }
      // create it
      dispatch(createCharacterPreset(preset))

      // save the presets file
      saveCharacterPresets(getState())

      // select the preset in the list
      dispatch(updateObject(sceneObject.id, { characterPresetId: id }))
    }
  }
)(
  // TODO could optimize by only passing sceneObject properties we actually care about
  React.memo(({ sceneObject, characterPresets, selectCharacterPreset, createCharacterPreset }) => {
    const onCreateCharacterPresetClick = event => {
      // show a prompt to get the desired preset name
      let id = THREE.Math.generateUUID()
      prompt({
        title: 'Preset Name',
        label: 'Select a Preset Name',
        value: `Character ${shortId(id)}`
      }, require('electron').remote.getCurrentWindow()).then(name => {
        if (name != null && name != '' && name != ' ') {
          createCharacterPreset({
            id,
            name,
            sceneObject
          })
        }
      }).catch(err => {
        console.error(err)
      })
    }

    const onSelectCharacterPreset = event => {
      let characterPresetId = event.target.value
      let preset = characterPresets[characterPresetId]
      selectCharacterPreset(sceneObject.id, characterPresetId, preset)
    }

    return h(
      ['div.row', { style: { margin: '9px 0 6px 0', paddingRight: 9 } }, [
        ['div', { style: { width: 50, display: 'flex', alignSelf: 'center' } }, 'preset'],
        [
          'select', {
            required: true,
            value: sceneObject.characterPresetId || '',
            onChange: preventDefault(onSelectCharacterPreset),
            style: {
              flex: 1,
              marginBottom: 0
            }
          }, [
              ['option', { value: '', disabled: true }, '---'],
              Object.values(characterPresets).map(preset =>
                ['option', { value: preset.id }, preset.name]
              )
            ]
          ]
        ],
        ['a.button_add[href=#]', { style: { marginLeft: 6 }, onClick: preventDefault(onCreateCharacterPresetClick) }, '+']
      ]
    )
  })
)

const savePosePresets = state => presetsStorage.savePosePresets({ poses: state.presets.poses })
const PosePresetsEditor = connect(
  state => ({
    posePresets: state.presets.poses
  }),
  {
    updateObject,
    selectPosePreset: (id, posePresetId, preset) => (dispatch, getState) => {
      dispatch(updateObject(id, {
        // set posePresetId
        posePresetId,
        // apply preset values to skeleton data
        skeleton: preset.state.skeleton
      }))
    },
    createPosePreset: ({ id, name, sceneObject }) => (dispatch, getState) => {
      // add the skeleton data to a named preset
      let preset = {
        id,
        name,
        state: {
          skeleton: sceneObject.skeleton || {}
        }
      }
      // create it
      dispatch(createPosePreset(preset))

      // save the presets file
      savePosePresets(getState())

      // select the preset in the list
      dispatch(updateObject(sceneObject.id, { posePresetId: id }))
    },
    // updatePosePreset,
    // deletePosePreset
  }
)(
  // TODO could optimize by only passing sceneObject properties we actually care about
  React.memo(({ sceneObject, posePresets, selectPosePreset, createPosePreset }) => {
    const onCreatePosePresetClick = event => {
      // show a prompt to get the desired preset name
      let id = THREE.Math.generateUUID()
      prompt({
        title: 'Preset Name',
        label: 'Select a Preset Name',
        value: `Pose ${shortId(id)}`
      }, require('electron').remote.getCurrentWindow()).then(name => {
        if (name != null && name != '' && name != ' ') {
          createPosePreset({
            id,
            name,
            sceneObject
          })
        }
      }).catch(err => {
        console.error(err)
      })
    }

    const onSelectPosePreset = event => {
      let posePresetId = event.target.value
      let preset = posePresets[posePresetId]
      selectPosePreset(sceneObject.id, posePresetId, preset)
    }

    return h(
      ['div.row', { style: { margin: '9px 0 6px 0', paddingRight: 9 } }, [
        ['div', { style: { width: 50, display: 'flex', alignSelf: 'center' } }, 'pose'],
        [
          'select', {
            required: true,
            value: sceneObject.posePresetId || '',
            onChange: preventDefault(onSelectPosePreset),
            style: {
              flex: 1,
              marginBottom: 0
            }
          }, [
              ['option', { value: '', disabled: true }, '---'],
              Object.values(posePresets).map(preset =>
                ['option', { value: preset.id }, preset.name]
              )
            ]
          ]
        ],
        ['a.button_add[href=#]', { style: { marginLeft: 6 }, onClick: preventDefault(onCreatePosePresetClick) }, '+']
      ]
    )
  }))

const MORPH_TARGET_LABELS = {
  'mesomorphic': 'meso',
  'ectomorphic': 'ecto',
  'endomorphic': 'obese',
}
const InspectedElement = ({ sceneObject, models, updateObject, selectedBone, machineState, transition, selectBone, updateCharacterSkeleton, calculatedName }) => {
  const createOnSetValue = (id, name, transform = value => value) => value => updateObject(id, { [name]: transform(value) })

  let positionSliders = [
    [NumberSlider, { label: 'x', value: sceneObject.x, min: -30, max: 30, onSetValue: createOnSetValue(sceneObject.id, 'x') } ],
    [NumberSlider, { label: 'y', value: sceneObject.y, min: -30, max: 30, onSetValue: createOnSetValue(sceneObject.id, 'y') } ],
    [NumberSlider, { label: 'z', value: sceneObject.z, min: -30, max: 30, onSetValue: createOnSetValue(sceneObject.id, 'z') } ],
  ]

  let volumeSliders = sceneObject.model === 'box'
    ? [
        [NumberSlider, { label: 'width', value: sceneObject.width, min: 0.025, max: 5, onSetValue: createOnSetValue(sceneObject.id, 'width') } ],
        [NumberSlider, { label: 'height', value: sceneObject.height, min: 0.025, max: 5, onSetValue: createOnSetValue(sceneObject.id, 'height') } ],
        [NumberSlider, { label: 'depth', value: sceneObject.depth, min: 0.025, max: 5, onSetValue: createOnSetValue(sceneObject.id, 'depth') } ]
      ]
    : [
        NumberSlider, {
          label: 'size',
          value: sceneObject.depth,
          min: 0.025,
          max: 5,
          onSetValue: value => updateObject(
            sceneObject.id,
            { width: value, height: value, depth: value }
          )
        }
      ]

  const onFocus = event => transition('TYPING_ENTER')
  const onBlur = event => transition('TYPING_EXIT')

  // TODO selector?
  const modelValues = Object.values(models)
  const modelOptions = {
    object: modelValues
      .filter(model => model.type === 'object')
      .map(model => ({ name: model.name, value: model.id })),

    character: modelValues
      .filter(model => model.type === 'character')
      .map(model => ({ name: model.name, value: model.id }))
  }

  return h([
    'div',

      [
        LabelInput,
        {
          key: sceneObject.id,
          label: sceneObject.name != null
            ? sceneObject.name
            : calculatedName,
          onFocus,
          onBlur,
          setLabel: name => {
            updateObject(sceneObject.id, { name })
          }
        }
      ],

      // character preset
      sceneObject.type == 'character' && [
        [CharacterPresetsEditor, { sceneObject }],
      ],

      (sceneObject.type == 'object' || sceneObject.type == 'character') && [
        ModelSelect, {
          sceneObject,
          options: modelOptions[sceneObject.type],
          updateObject,
          transition
        }
      ],

      // sceneObject.type == 'object' && [
      //   'select', {
      //     value: sceneObject.model,
      //     onChange: event => {
      //       event.preventDefault()
      //       updateObject(sceneObject.id, { model: event.target.value })
      //     }
      //   }, [
      //     [['box', 'box'], ['tree', 'tree'], ['chair', 'chair']].map(([name, value]) =>
      //       ['option', { value }, name]
      //     )
      //   ]
      // ],

      sceneObject.type != 'camera' &&
        [
          'div.row',
          { style: { alignItems: 'center' } }, [

            ['div', { style: { width: 50 } }, 'visible'],

            ['input', {
              type: 'checkbox',
              checked: sceneObject.visible,
              readOnly: true
            }],

            ['label', {
              onClick: preventDefault(event => {
                if (sceneObject.type === 'character') {
                  selectBone(null)
                }
                updateObject(sceneObject.id, { visible: !sceneObject.visible })
              }),
            }, [
              'span'
            ]]
          ]
        ],

      [
        'div.column',
        positionSliders
      ],

      sceneObject.type == 'object' && [
        [
          'div.column',
          volumeSliders
        ],
      ],

      sceneObject.type == 'light' && [
        [
          'div.column',
          [NumberSlider, { label: 'intensity', value: sceneObject.intensity, min: 0.025, max: 1, onSetValue: createOnSetValue(sceneObject.id, 'intensity') } ],
        ],
        [
          'div.column',
          [NumberSlider, {
            label: 'angle',
            value: sceneObject.angle,
            min: 0.025,
            max: Math.PI/2,
            onSetValue: createOnSetValue(sceneObject.id, 'angle'),
            step: Math.PI/180,
            transform: NumberSliderTransform.radians,
            formatter: NumberSliderFormatter.radToDeg
           }]
        ],
        [
          'div.column',
          [NumberSlider, { label: 'distance', value: sceneObject.distance, min: 0.025, max: 100, onSetValue: createOnSetValue(sceneObject.id, 'distance') } ],
        ],
        [
          'div.column',
          [NumberSlider, { label: 'penumbra', value: sceneObject.penumbra, min: 0, max: 1, onSetValue: createOnSetValue(sceneObject.id, 'penumbra') } ],
        ],
        [
          'div.column',
          [NumberSlider, { label: 'decay', value: sceneObject.decay, min: 1, max: 2, onSetValue: createOnSetValue(sceneObject.id, 'decay') } ],
        ],
      ],

      ['div',
        [NumberSlider, {
          label: 'rotation',
          min: -180,
          max: 180,
          step: 1,
          value: THREE.Math.radToDeg(sceneObject.rotation),
          onSetValue: value => updateObject(sceneObject.id, { rotation: THREE.Math.degToRad(value) }),
          transform: NumberSliderTransform.degrees,
          formatter: NumberSliderFormatter.degrees
        }]
      ],
   

      sceneObject.type == 'camera' &&
        ['div',
          [NumberSlider, {
            label: 'roll',
            min: -45,
            max: 45,
            step: 1,
            value: THREE.Math.radToDeg(sceneObject.roll),
            onSetValue: value => updateObject(sceneObject.id, { roll: THREE.Math.degToRad(value) }),
            transform: NumberSliderTransform.degrees,
            formatter: NumberSliderFormatter.degrees
          }]
        ],

      (sceneObject.type == 'camera' || sceneObject.type == 'light') &&
        ['div',
          [NumberSlider, {
            label: 'tilt',
            min: -90,
            max: 90,
            step: 1,
            value: THREE.Math.radToDeg(sceneObject.tilt),
            onSetValue: value => updateObject(sceneObject.id, { tilt: THREE.Math.degToRad(value) }),
            formatter: NumberSliderFormatter.degrees
          }]
        ],

      sceneObject.type == 'camera' &&
        [
          NumberSlider, {
            label: 'F.O.V.',
            min: 1,
            max: 120,
            step: 1,
            value: sceneObject.fov,
            onSetValue: createOnSetValue(sceneObject.id, 'fov'),
            formatter: value => value.toFixed(1) + '°'
          }
        ],

      sceneObject.type == 'character' && (
        ModelLoader.isCustomModel(sceneObject.model)
          ? [
            ['div', { style: { flex: 1, paddingBottom: 6 } }, [
              [NumberSlider, {
                label: 'height',
                min: 0.3,
                max: 3.05,
                step: 0.0254,
                value: sceneObject.height,
                onSetValue: createOnSetValue(sceneObject.id, 'height'),
              }]]
            ]
          ]
          : [
            ['div', { style: { flex: 1, paddingBottom: 6 } }, [
              [NumberSlider, {
                label: 'height',
                min: 1.4732,
                max: 2.1336,
                step: 0.0254,
                value: sceneObject.height,
                onSetValue: createOnSetValue(sceneObject.id, 'height'),
                formatter: value => feetAndInchesAsString(
                  ...metersAsFeetAndInches(
                    sceneObject.height
                  )
                )
              }],

              [
                NumberSlider,
                {
                  label: 'head',
                  min: 80,
                  max: 120,
                  step: 1,
                  value: sceneObject.headScale * 100,
                  onSetValue: createOnSetValue(sceneObject.id, 'headScale', value => value / 100),
                  formatter: value => Math.round(value).toString() + '%'
                }
              ],
            ]],

            ['div', { style: { margin: '6px 0 3px 0', fontStyle: 'italic' } }, 'morphs'],

            ['div', { style: { flex: 1 } },
              Object.entries(sceneObject.morphTargets).map(([ key, value ]) =>
                [
                  NumberSlider,
                  {
                    label: MORPH_TARGET_LABELS[key],
                    min: 0,
                    max: 100,
                    step: 1,
                    value: value * 100,
                    onSetValue: value => updateObject(
                      sceneObject.id,
                      { morphTargets: { [key]: value / 100 }
                    }),
                    formatter: NumberSliderFormatter.percent
                  }
                ]
              )
            ]
          ]
      ),

      sceneObject.type == 'character' && [
        // pose preset
        [PosePresetsEditor, { sceneObject }],

        selectedBone && [BoneEditor, { sceneObject, bone: selectedBone, updateCharacterSkeleton }],
      ]
    ]
  )
}

// TODO is there a simpler way to get the default rotation of a bone?
// via THREE.Skeleton#pose()
const getDefaultRotationForBone = (skeleton, bone) => {
  let dummy = new THREE.Object3D()
  dummy.matrixWorld.getInverse( skeleton.boneInverses[ skeleton.bones.indexOf(bone) ] )

  if ( bone.parent && bone.parent.isBone ) {
    dummy.matrix.getInverse( bone.parent.matrixWorld )
    dummy.matrix.multiply( dummy.matrixWorld )
  } else {
    dummy.matrix.copy( dummy.matrixWorld )
  }

  var p = new THREE.Vector3()
  var q = new THREE.Quaternion();
  var s = new THREE.Vector3()
  dummy.matrix.decompose( p, q, s )

  let e = new THREE.Euler()
  e.setFromQuaternion( q )

  return { x: e.x, y: e.y, z: e.z }
}

const BoneEditor = ({ sceneObject, bone, updateCharacterSkeleton }) => {
  const { scene } = useContext(SceneContext)

  let sceneObj = scene.children.find(o => o.userData.id === sceneObject.id)
  let skeleton = (sceneObj.children[0] instanceof THREE.Mesh) ? sceneObj.children[0].skeleton : sceneObj.children[1].skeleton

  // has the user modified the skeleton?
  bone = sceneObject.skeleton[bone.name]
    // use the modified skeleton data
    ? {
      type: 'modified',
      name: bone.name,
      rotation: sceneObject.skeleton[bone.name].rotation
    }
    // otherwise, use the default rotation of the bone
    //
    // the scene is not guaranteed to be updated at this point
    // so we have to actually calculate the default rotation
    : {
      type: 'default',
      name: bone.name,
      rotation: getDefaultRotationForBone(skeleton, bone)
    }

  const createOnSetValue = (key, transform) => value => {
    updateCharacterSkeleton({
      id: sceneObject.id,
      name: bone.name,
      rotation: {
        x: bone.rotation.x,
        y: bone.rotation.y,
        z: bone.rotation.z,
        [key]: transform(value)
      }
    })
  }

  return h(
    ['div.column', { style: { } }, [

      ['div.row', { style: { margin: '9px 0 6px 0', paddingRight: 9 } }, [
        ['div', { style: { width: 50 }}, 'bone'],
        ['div', { style: { flex: 1 }}, bone.name],
        ['div', { style: { width: 40 }}]
      ]],

      ['div.column', { style: { margin: '9px 0 6px 0', paddingRight: 9 } }, [
        [NumberSlider,
          {
            label: 'x',
            min: -180,
            max: 180,
            step: 1,
            value: THREE.Math.radToDeg(bone.rotation.x),
            onSetValue: createOnSetValue('x', THREE.Math.degToRad),
            transform: NumberSliderTransform.degrees,
            formatter: NumberSliderFormatter.degrees
          }
        ],
        [NumberSlider,
          {
            label: 'y',
            min: -180,
            max: 180,
            step: 1,
            value: THREE.Math.radToDeg(bone.rotation.y),
            onSetValue: createOnSetValue('y', THREE.Math.degToRad),
            transform: NumberSliderTransform.degrees,
            formatter: NumberSliderFormatter.degrees
          }
        ],
        [NumberSlider,
          {
            label: 'z',
            min: -180,
            max: 180,
            step: 1,
            value: THREE.Math.radToDeg(bone.rotation.z),
            onSetValue: createOnSetValue('z', THREE.Math.degToRad),
            transform: NumberSliderTransform.degrees,
            formatter: NumberSliderFormatter.degrees
          }
        ]
      ]]
    ]]
  )
}

const ELEMENT_HEIGHT = 40
const Element = React.memo(({ index, style, sceneObject, isSelected, isActive, onSelectObject, onUpdateObject, deleteObject, setActiveCamera, machineState, transition, allowDelete, calculatedName }) => {
  const onClick = event => {
    event.preventDefault()
    onSelectObject(sceneObject.id)
    if (sceneObject.type === 'camera') {
      setActiveCamera(sceneObject.id)
    }
  }

  const onDeleteClick = event => {
    event.preventDefault()
    let choice = dialog.showMessageBox(null, {
      type: 'question',
      buttons: ['Yes', 'No'],
      message: 'Are you sure?',
      defaultId: 1 // default to No
    })
    if (choice === 0) {
      deleteObject(sceneObject.id)
    }
  }

  let typeLabels = {
    'camera': 'CAM',
    'character': 'CHR',
    'object': 'OBJ',
    'light': 'LGT'
  }

  let className = classNames({
    'selected': isSelected,
    'zebra': index % 2
  })

  return h([
    'div.element', { className, style: { height: ELEMENT_HEIGHT, ...style } }, [
      [
        'a.title[href=#]',
        { onClick },
        [
          ['span.type', typeLabels[sceneObject.type]],
          ...(sceneObject.name
            ? [
                ['span.name', sceneObject.name]
              ]
            : [
                ['span.id', calculatedName]
              ]
          ),
          // isActive && ['span.active', '👀'],
          // sceneObject.visible && ['span.visibility', '👁']
        ]
      ],
      allowDelete && ['a.delete[href=#]', { onClick: onDeleteClick }, 'X']
    ]
  ])
})

const PhoneCursor = connect(
  state => ({
    selection: state.selection,
    sceneObjects: state.sceneObjects,
  }),
  {
    selectObject,
    selectBone,
  })(
    ({ remoteInput, camera, largeCanvasRef, selectObject, selectBone, sceneObjects, selection }) => {
      let startingDeviceRotation = useRef(null)
      let startingObjectRotation = useRef(null)
      let tester = useRef(null)
      let isRotating = useRef(false)
      let intersectionPlane = useRef(null)
      let xy = useRef({x:0, y:0})
      let lastxy = useRef({x:0, y:0})
      let viewportwidth = largeCanvasRef.current.clientWidth,
          viewportheight = largeCanvasRef.current.clientHeight
      const rect = largeCanvasRef.current.getBoundingClientRect();
      const canvasPosition = {
        x: rect.left,
        y: rect.top
      }
      let oldxy = useRef({x:viewportwidth/2,y:viewportheight/2})
      const isButtonClicked = useRef(false)
      const { scene } = useContext(SceneContext)
      let bonesHelper = useRef(null)

      const setPlanePosition = (obj) => {
        let direction = new THREE.Vector3() // create once and reuse it!
        camera.getWorldDirection( direction )
        let newPos = new THREE.Vector3()
        let dist = 3
        newPos.addVectors ( camera.position, direction.multiplyScalar( dist ) )
        obj.position.set(newPos.x, newPos.y, newPos.z)
        obj.lookAt(camera.position)
      }

      const setCylinderOrientation = (obj) => {
        let direction = new THREE.Vector3()
        camera.getWorldDirection( direction )
        obj.position.set(camera.x, camera.y, camera.z)
        //obj.quaternion.copy(camera.quaternion)
      }

      const findIntersection = ( origin, ph_direction, obj ) =>
      {
        var raycaster = new THREE.Raycaster(origin, ph_direction)
        var intersection = raycaster.intersectObject(obj, true)
        return intersection
      }

      const toScreenXY = ( position, camera ) => {

        var pos = position.clone()
        projScreenMat = new THREE.Matrix4()
        projScreenMat.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse )
        pos = pos.applyMatrix4( projScreenMat )
        return { x: ( pos.x  ),
             y: ( - pos.y )}
      }

      const getObjectAndBone = ( intersect ) => {
        if (intersect.object instanceof THREE.Mesh && intersect.object.userData.type === 'hitter' )
        {
          let obj = intersect.object.parent.object3D
          return [obj, null]
        }

        let isBone = intersect.object.parent instanceof BonesHelper

        let object = isBone
          ? intersect.object.parent.root.parent
          : intersect.object

        let bone = isBone
          // object.parent.root.parent.skeleton.bones
          //   .find(b => b.uuid === o.object.userData.bone)
          ? intersect.bone
          : null

        return [object, bone]
      }

      useEffect(() => {
        if (camera !== undefined && camera !== null && remoteInput.mouseMode)
        {
          if (camera.parent) scene.current = camera.parent
          if (intersectionPlane.current)
          {
            //return
            // intersection plane exists
          } else {
            intersectionPlane.current = new THREE.Mesh(
              //new THREE.CylinderGeometry(1, 1, 40, 16, 2),
              new THREE.PlaneGeometry(50, 30, 2),
              new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ))
            setPlanePosition(intersectionPlane.current)
            //setCylinderOrientation(intersectionPlane.current)
            //scene.current.add(intersectionPlane.current)  //
            intersectionPlane.current.updateMatrix()  // required for correct first pass
          }

          if (tester.current) {
            //console.log('tester exists')
          }
          else {
            tester.current = new THREE.Object3D()
            let m = new THREE.Mesh(
              new THREE.BoxGeometry(0.01, 0.01, 0.01),
              new THREE.MeshBasicMaterial({color: '#123123' })
            )
            m.position.z = -0.005
            tester.current.position.set(camera.position.x, camera.position.y, camera.position.z)
            tester.current.position.y -= 0.05;
            tester.current.quaternion.copy(camera.quaternion)
            //tester.current.add(new THREE.AxesHelper(1))
            tester.current.add(m)
            scene.current.add(tester.current)
          }
        }

        // handling phone rotation to screen position here
        if (remoteInput.mouseMode)
        {
          let last_xy = {x:0,y:0}
          if (remoteInput.down && !remoteInput.mouseModeClick)
          {
            let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
            if (!isRotating.current) {
              isRotating.current = true
              let target = tester.current
              startingObjectRotation.current ={
                x: target.rotation.x,
                y: target.rotation.y,
                z: target.rotation.z
              }
              startingDeviceRotation.current = {
                alpha: alpha,
                beta: beta,
                gamma: gamma
              }
            }
            let w = 0,
              x = 0,
              y = 0,
              z = 1
            let startingDeviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingDeviceRotation.current.beta, startingDeviceRotation.current.alpha, -startingDeviceRotation.current.gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha, -gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
            startingDeviceQuaternion.multiply(camera.quaternion)
            deviceQuaternion.multiply(camera.quaternion)
            let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)
            let startingObjectQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingObjectRotation.current.x,startingObjectRotation.current.y,startingObjectRotation.current.z))

            startingObjectQuaternion.multiply(deviceDifference)
            tester.current.quaternion.copy(startingObjectQuaternion)
            let dir = new THREE.Vector3()
            tester.current.updateMatrixWorld()
            tester.current.children[0].getWorldDirection(dir).negate()
            //tester.current.updateMatrix()
            let intersect = findIntersection(camera.position, dir, intersectionPlane.current)
            if (intersect.length>0)
            {
              let xy_coords = toScreenXY( intersect[0].point, camera )
              xy_coords.x = xy_coords.x * 100 + viewportwidth/2 - (viewportwidth/2 - oldxy.current.x)
              xy_coords.y = xy_coords.y * 100 + viewportheight/2 - (viewportheight/2- oldxy.current.y)


              xy_coords.x = xy_coords.x > 0 ? xy_coords.x : 0
              xy_coords.y = xy_coords.y > 0 ? xy_coords.y : 0
              xy.current = {
                x: xy_coords.x < viewportwidth - 10 ? xy_coords.x + canvasPosition.x : viewportwidth  - 10 + canvasPosition.x,
                y: xy_coords.y < viewportheight - 10 ? xy_coords.y  : viewportheight - 10 //+ canvasPosition.y
              }
            }
          } else {
            if (scene.current && tester.current!=null)
            {
              isRotating.current = false
              scene.current.remove(tester.current)
              scene.current.remove(intersectionPlane.current)
              tester.current = null
              intersectionPlane.current = null
              if (xy.current.x !== 0 && xy.current.y !== 0 )
              {
                oldxy.current = {
                  x: xy.current.x - canvasPosition.x,
                  y: xy.current.y

                }
              }
            }
          }
        } else {
          // not in mouse mode
          oldxy.current = {
            x: viewportwidth/2,
            y: viewportheight/2
          }
          if (scene.current && tester.current!=null)
          {
            isRotating.current = false
            scene.current.remove(tester.current)
            scene.current.remove(intersectionPlane.current)
            tester.current = null
            intersectionPlane.current = null
          }
        }

      }, [remoteInput, selection])

      useEffect(() => {
        //handling button click on phone
        if (!remoteInput.mouseModeClick) {
          if (isButtonClicked.current) isButtonClicked.current = false
          return
        }
        if (isButtonClicked.current) return
        isButtonClicked.current = true

        var raycaster = new THREE.Raycaster()
        var phoneMouse = new THREE.Vector2()

        phoneMouse.x = ( (oldxy.current.x ) / viewportwidth ) * 2 - 1
    	  phoneMouse.y = - ( (oldxy.current.y ) / viewportheight ) * 2 + 1

        raycaster.setFromCamera( phoneMouse, camera )

        let checkIntersectionsWithMeshes = []
        for (var o of draggables(sceneObjects, scene))
        {
          if (o instanceof THREE.Mesh) checkIntersectionsWithMeshes.push(o)
          if (o instanceof THREE.Object3D && o.userData.type === 'character')
          {
            checkIntersectionsWithMeshes = checkIntersectionsWithMeshes.concat(o.bonesHelper.hit_meshes)
          }
        }

        var noIntersect = true
      	var intersects = raycaster.intersectObjects( checkIntersectionsWithMeshes )
        for ( var i = 0; i < intersects.length; i++ ) {

          if (intersects[i].object.userData.type === 'object' || intersects[i].object.userData.type==='hitter')
          {
            noIntersect = false

            let obj = getObjectAndBone( intersects[ i ] ) [0]
            let currentSelected = scene.children.find(child => child.userData.id === selection)
            if (currentSelected === obj) {

              let hits
              let bone

              if (currentSelected.bonesHelper) {
                hits = raycaster.intersectObject( currentSelected.bonesHelper )
                bone = hits.length && getObjectAndBone( hits[ 0 ] )[1]
              }
            // ... select bone (if any) ...
              if (bone) {
                selectBone( bone.uuid )
              } else {
                selectBone( null )
              }
            } else {
              // select the object
              selectBone( null )
              selectObject(obj.userData.id)
            }
          }
        }
        if (noIntersect) {
          selectBone( null )
          selectObject( null )
        }
      }, [remoteInput])

      return h(
        ['div#phoneCursor', { key: 'cursor' } ,
          [
            ['div#testCursor]', { key: 'testcursor', style: {
              top: xy.current ? xy.current.y : 0,
              left: xy.current ? xy.current.x : 0
            } }],
          ]
        ]
      )
    })

const Toolbar = ({ createObject, selectObject, loadScene, saveScene, camera, setActiveCamera, resetScene, saveToBoard, insertAsNewBoard }) => {
  const onCreateCameraClick = () => {
    let id = THREE.Math.generateUUID()
    createObject({
      id,

      type: 'camera',
      fov: 22.25,
      x: 0,
      y: 6,
      z: 2,
      rotation: 0,
      tilt: 0,
      roll: 0
    })
    selectObject(id)
    setActiveCamera(id)
  }

  const onCreateObjectClick = () => {
    let id = THREE.Math.generateUUID()
    //let camera = findCamera();
    let newPoz = generatePositionAndRotation(camera)

    createObject({
      id,
      type: 'object',
      model: 'box',
      width: 1,
      height: 1,
      depth: 1,
      x: newPoz.x,
      y: newPoz.y,
      z: newPoz.z,
      rotation: 0, //Math.random() * Math.PI * 2,

      visible: true
    })
    selectObject(id)
  }

  const generatePositionAndRotation = (camera) => {
    let direction = new THREE.Vector3() // create once and reuse it!
    camera.getWorldDirection( direction )
    let newPos = new THREE.Vector3()
    let dist = (Math.random()) * 6 + 3
    newPos.addVectors ( camera.position, direction.multiplyScalar( dist ) )
    let obj = new THREE.Object3D()
    newPos.x += (Math.random() * 4 - 2)
    newPos.z += (Math.random() * 4 - 2)
    obj.position.set(newPos.x, 0, newPos.z)
    obj.lookAt(camera.position)
    obj.rotation.set(0, obj.rotation.y, 0)  //maybe we want rotation relative to camera (facing the camera)
    obj.rotation.y = Math.random() * Math.PI * 2

    return {
      x: obj.position.x,
      y: obj.position.z,
      z: obj.position.y,
      rotation: obj.rotation.y
    }
  }

  const onCreateCharacterClick = () => {
    let newPoz = generatePositionAndRotation(camera)
    let id = THREE.Math.generateUUID()
    createObject({
      id,
      type: 'character',
      height: 1.8,
      model: 'adult-male',
      x: newPoz.x,
      y: newPoz.y,
      z: newPoz.z,
      rotation: 0,//newPoz.rotation,
      headScale: 1,

      morphTargets: {
        mesomorphic: 0,
        ectomorphic: 0,
        endomorphic: 0
      },

      skeleton: {},

      visible: true
    })
    selectObject(id)
  }

  const onCreateLightClick = () => {
    let id = THREE.Math.generateUUID()

    createObject({
      id,
      type: 'light',
      x: 0,
      y: 0,
      z: 2,
      rotation: 0,
      tilt: 0,
      intensity: 0.8,
      visible: true,
      angle: 1.04,
      distance: 5,
      penumbra: 1.0,
      decay: 1,
    })
    selectObject(id)
  }

  const onCreateStressClick = () => {
    for (let i = 0; i < 500; i++) {
      onCreateObjectClick()
    }
    for (let i = 0; i < 20; i++) {
      onCreateCharacterClick()
    }
    setTimeout(() => {
      console.log(Object.values($r.store.getState().sceneObjects).length, 'scene objects')
    }, 100)
  }

  const onLoadClick = () => {
    let filepaths = dialog.showOpenDialog(null, {})
    if (filepaths) {
      let filepath = filepaths[0]
      let choice = dialog.showMessageBox(null, {
        type: 'question',
        buttons: ['Yes', 'No'],
        message: 'Your existing scene will be cleared to load the file. Are you sure?',
        defaultId: 1 // default to No
      })
      if (choice === 0) {
        try {
          let data = JSON.parse(
            fs.readFileSync(filepath)
          )
          loadScene(data)
        } catch (err) {
          console.error(err)
          dialog.showMessageBox(null, {
            message: 'Sorry, an error occurred.'
          })
        }
      }
    }
  }

  const onSaveClick = () => {
    let filepath = dialog.showSaveDialog(null, { defaultPath: 'test.json' })
    if (filepath) {
      // if (fs.existsSync(filepath)) {
      //   let choice = dialog.showMessageBox(null, {
      //     type: 'question',
      //     buttons: ['Yes', 'No'],
      //     message: 'That file already exists. Overwrite?',
      //     defaultId: 1 // default to No
      //   })
      //   if (choice === 1) return
      // }
      saveScene(filepath)
    }
  }

  const onClearClick = () => {
    let choice = dialog.showMessageBox(null, {
      type: 'question',
      buttons: ['Yes', 'No'],
      message: 'Your existing scene will be cleared. Are you sure?',
      defaultId: 1 // default to No
    })
    if (choice === 0) {
      resetScene()
    }
  }

  const onSaveToBoardClick = event => {
    saveToBoard()
  }

  const onInsertNewBoardClick = event => {
    insertAsNewBoard()
  }

  return h(
    ['div#toolbar', { key: 'toolbar' },
      ['div.row', [
        ['a[href=#]', { onClick: preventDefault(onCreateCameraClick) }, '+ Camera'],
        ['a[href=#]', { onClick: preventDefault(onCreateObjectClick) }, '+ Object'],
        ['a[href=#]', { onClick: preventDefault(onCreateCharacterClick) }, '+ Character'],
        ['a[href=#]', { onClick: preventDefault(onCreateLightClick) }, '+ Light'],
      ]],
      // ['a[href=#]', { onClick: preventDefault(onCreateStressClick) }, '+ STRESS'],

      // ['a[href=#]', { onClick: preventDefault(onClearClick) }, 'Clear'],
      // ['a[href=#]', { onClick: preventDefault(onLoadClick) }, 'Load'],
      // ['a[href=#]', { onClick: preventDefault(onSaveClick) }, 'Save'],

      ['div.row', [
        ['a[href=#]', { onClick: preventDefault(onSaveToBoardClick) }, 'Save to Board'],
        ['a[href=#]', { onClick: preventDefault(onInsertNewBoardClick) }, 'Insert As New Board']
      ]]
    ]
  )
}

const CameraInspector = connect(
  state => ({
    mainViewCamera: state.mainViewCamera,
    sceneObjects: state.sceneObjects,
    activeCamera: state.activeCamera
  }),
  {
    setMainViewCamera,
    setActiveCamera
  }
)(
  React.memo(({ sceneObjects, mainViewCamera, setMainViewCamera, activeCamera, setActiveCamera }) => {
    const { scene } = useContext(SceneContext)

    let camera = scene.children.find(child => child.userData.id === activeCamera)

    let closest = null

    if (!camera) return h(['div#camera-inspector', { style: { padding: 12, lineHeight: 1.25 } }])

    let cameraState = sceneObjects[activeCamera]

    // calculated value
    let cameras = Object.values(sceneObjects).filter(o => o.type === 'camera').map((o, n) => ([
      `Camera ${n + 1}`, o.id
    ]))

    fakeCamera = camera.clone() // TODO reuse a single object
    fakeCamera.fov = cameraState.fov
    let focalLength = fakeCamera.getFocalLength()
    fakeCamera = null

    let tiltInDegrees = Math.round(cameraState.tilt * THREE.Math.RAD2DEG)

    let [heightFeet, heightInches] = metersAsFeetAndInches(cameraState.z)
    //console.log(this)
    let scope = this
    useEffect(() => {
      camera = scene.children.find(child => child.userData.id === activeCamera)
      // calculate distance to characters, get the closest
      requestAnimationFrame(() => {
        closest = getClosestCharacterInView (characters(scene), camera)
      })
      //we have to wait for them to be added to the stage

    }, [sceneObjects, activeCamera])

    const getClosestCharacterInView = (objects, camera) => {
      let obj = null
      let dist = 1000000
      let allDistances = []

      for (var char of objects)
      {
        let d = camera.position.distanceTo (new THREE.Vector3(char.position.x, camera.position.y, char.position.z))
        allDistances.push({
          object: char,
          distance: d
        })
      }

      let compare = (a,b) => {
        if (a.distance < b.distance)
          return -1;
        if (a.distance > b.distance)
          return 1;
        return 0;
      }

      allDistances.sort(compare)
      for (var i = 0; i< allDistances.length; i++)
      {
        if (checkIfCharacterInCameraView(allDistances[i].object, camera))
          return allDistances[i]
      }

      return {
        object: obj,
        distance: dist !== 1000000 ? dist : 0
      }
    }

    const checkIfCharacterInCameraView = (character, camera) => {
      camera.updateMatrix();
      camera.updateMatrixWorld();
      var frustum = new THREE.Frustum();
      frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      for (var hitter of character.bonesHelper.hit_meshes)
      {
        if (frustum.intersectsBox(new THREE.Box3().setFromObject( hitter ))) {
          return true
        }
      }
      return false
    }

    closest = getClosestCharacterInView (characters(scene), camera)

    let [distFeet, distInches] = metersAsFeetAndInches(closest.distance)

    // HACK this should be based directly on state.sceneObjects, or cached in the sceneObject data
    let calculatedName
    let sceneObject = closest.object ? sceneObjects[closest.object.userData.id] : undefined
    if (sceneObject) {
      // TODO DRY
      const number = Object.values(sceneObjects).filter(o => o.type === sceneObject.type).indexOf(sceneObject) + 1
      const capitalize = string => string.charAt(0).toUpperCase() + string.slice(1)
      calculatedName = sceneObject.name || capitalize(`${sceneObject.type} ${number}`)
    }

    let cameraNumber = Object.values(sceneObjects).filter(o => o.type === 'camera').indexOf(cameraState) + 1
    let cameraName = `Camera ${cameraNumber}`


    return h(
      ['div#camera-inspector', { style: { padding: 12, lineHeight: 1.25 } },

        ['div.row',
          { style: { justifyContent: 'space-between' } },
          [
            'div',
            `${cameraName}, ${Math.round(focalLength)}mm, f/1.4`,
            ['br'],
            `Height: ${feetAndInchesAsString(heightFeet, heightInches)} Tilt: ${tiltInDegrees}°`,
            ['br'],
            closest.object ? `${feetAndInchesAsString(distFeet, distInches)} (${parseFloat(Math.round(closest.distance * 100) / 100).toFixed(2)}m) from ${calculatedName}` : ''
          ],
          [
            'div.column',
            {
              style: { alignItems: 'flex-end' }
            },
            [
              [
                'select', {
                  value: activeCamera,
                  onChange: event => {
                    event.preventDefault()
                    setActiveCamera(event.target.value)
                  },
                  style: {
                    width: 'auto'
                  }
                },
                cameras.map(([name, value]) => ['option', { value }, name])
              ],
              [
                'span',
                [
                  'a.button[href=#]',
                  {
                    onClick: event => {
                      event.preventDefault()
                      setMainViewCamera(mainViewCamera === 'ortho' ? 'live' : 'ortho')
                    },
                  },
                  ['span', { style: { letterSpacing: '0.1rem' }}, ' (T)'],
                  ['span', 'oggle Large/Small']
                ]
              ]
            ]
          ]
        ],
        // [RemoteInputView, { remoteInput }]
      ]
    )
  }
))

const editorMachine = Machine({
  id: 'editor',
  initial: 'idle',
  strict: true,
  states: {
    idle: {
      on: {
        TYPING_ENTER: 'typing',
        EDITING_ENTER: 'editing',
        PROCESSING_ENTER: 'processing'
      }
    },
    typing: {
      on: {
        TYPING_EXIT: 'idle'
      }
    },
    editing: {
      on: {
        EDITING_EXIT: 'idle'
      }
    },
    processing: {
      on: {
        PROCESSING_EXIT: 'idle'
      }
    }
  }
})

// TODO move selector logic into reducers/shot-generator?
// memoized selectors
const getSceneObjects = state => state.sceneObjects
const getSelection = state => state.selection
const getCameraSceneObjects = createSelector(
  [getSceneObjects],
  (sceneObjects) => Object.values(sceneObjects).filter(o => o.type === 'camera')
)
const getSelectedSceneObject = createSelector(
  [getSceneObjects, getSelection],
  (sceneObjects, selection) => Object.values(sceneObjects).find(o => o.id === selection)
)
const canDelete = (sceneObject, activeCamera) =>
  // allow objects
  sceneObject.type === 'object' ||
  // allow characters
  sceneObject.type === 'character' ||
  // allow cameras which are not the active camera
  (sceneObject.type === 'camera' && sceneObject.id !== activeCamera)

const menu = require('../menu')
const onMenuFocus = () => {
  menu.setShotGeneratorMenu()
}
const MenuManager = ({ }) => {
  useEffect(() => {
    let win = remote.getCurrentWindow()
    win.on('focus', onMenuFocus)
    onMenuFocus()

    return function cleanup () {
      win.off('focus', onMenuFocus)
    }
  }, [])
  return null
}

const KeyHandler = connect(
  state => ({
    mainViewCamera: state.mainViewCamera,
    activeCamera: state.activeCamera,
    selection: state.selection,

    _selectedSceneObject: getSelectedSceneObject(state),

    _cameras: getCameraSceneObjects(state)
  }),
  {
    setMainViewCamera,
    selectObject,
    setActiveCamera,
    duplicateObject,
    deleteObject,
    updateObject
  }
)(
  ({
    mainViewCamera,
    activeCamera,
    selection,
    _selectedSceneObject,
    _cameras,
    setMainViewCamera,
    selectObject,
    setActiveCamera,
    duplicateObject,
    deleteObject,
    updateObject
  }) => {
    const { scene } = useContext(SceneContext)

    useEffect(() => {
      const onKeyDown = event => {
        if (event.key === 'Backspace') {
          if (selection && canDelete(_selectedSceneObject, activeCamera)) {
            let choice = dialog.showMessageBox(null, {
              type: 'question',
              buttons: ['Yes', 'No'],
              message: 'Are you sure?'
            })
            if (choice === 0) {
              deleteObject(selection)
            }
          }
        }
        if (event.key === 'd' && event.ctrlKey) {
          if (selection) {
            let destinationId = THREE.Math.generateUUID()
            duplicateObject(selection, destinationId)
            selectObject(destinationId)
          }
        }
        if (event.key === 't') {
          setMainViewCamera(mainViewCamera === 'ortho' ? 'live' : 'ortho')
        }
        if (event.key === 'Escape') {
          selectObject(activeCamera)
        }
        if (event.key === '1') { if (_cameras[0]) { setActiveCamera(_cameras[0].id) }}
        if (event.key === '2') { if (_cameras[1]) { setActiveCamera(_cameras[1].id) }}
        if (event.key === '3') { if (_cameras[2]) { setActiveCamera(_cameras[2].id) }}
        if (event.key === '4') { if (_cameras[3]) { setActiveCamera(_cameras[3].id) }}
        if (event.key === '5') { if (_cameras[4]) { setActiveCamera(_cameras[4].id) }}
        if (event.key === '6') { if (_cameras[5]) { setActiveCamera(_cameras[5].id) }}
        if (event.key === '7') { if (_cameras[6]) { setActiveCamera(_cameras[6].id) }}
        if (event.key === '8') { if (_cameras[7]) { setActiveCamera(_cameras[7].id) }}
        if (event.key === '9') { if (_cameras[8]) { setActiveCamera(_cameras[8].id) }}

        if (event.key === 'z' || event.key === 'x') {
          let cameraState = _cameras.find(camera => camera.id === activeCamera)
          let roll = {
            'z': Math.max(cameraState.roll - THREE.Math.DEG2RAD, -45 * THREE.Math.DEG2RAD),
            'x': Math.min(cameraState.roll + THREE.Math.DEG2RAD, 45 * THREE.Math.DEG2RAD)
          }[event.key]

          updateObject(activeCamera, { roll })
        }

        if (event.key === '[' || event.key === ']') {
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
            '[': fovs[Math.min(index + 1, fovs.length)],
            ']': fovs[Math.max(index - 1, 0)]
          }[event.key]

          updateObject(activeCamera, { fov })
        }
      }

      window.addEventListener('keydown', onKeyDown)

      return function cleanup () {
        window.removeEventListener('keydown', onKeyDown)
      }
    }, [mainViewCamera, _cameras, selection, _selectedSceneObject, activeCamera])

    return null
  }
)

const serializeState = state => {
  return {
    world: state.world,
    sceneObjects: state.sceneObjects,
    activeCamera: state.activeCamera
  }
}

const Editor = connect(
  state => ({
    mainViewCamera: state.mainViewCamera,
    activeCamera: state.activeCamera,
    remoteInput: state.input,
    aspectRatio: state.aspectRatio,
    sceneObjects: state.sceneObjects,
  }),
  {
    createObject,
    selectObject,
    updateModels: payload => ({ type: 'UPDATE_MODELS', payload }),
    loadScene,
    saveScene: filepath => (dispatch, getState) => {
      let state = getState()
      let contents = serializeState(state)
      fs.writeFileSync(filepath, JSON.stringify(contents, null, 2))
      dialog.showMessageBox(null, { message: 'Saved!' })
    },
    setActiveCamera,
    resetScene,

    // TODO DRY
    saveToBoard: () => (dispatch, getState) => {
      dispatch(selectObject(null))

      let state = getState()

      requestAnimationFrame(() => {

        // HACK FIXME don't hardcode these
        let cameraImage = document.querySelector('#camera-canvas').toDataURL()
        let topDownImage = document.querySelector('#top-down-canvas').toDataURL()

        ipcRenderer.send('saveShot', {
          data: serializeState(state),
          images: {
            'camera': cameraImage,
            'topdown': topDownImage
          }
        })

      })
    },

    // TODO DRY
    insertAsNewBoard: () => (dispatch, getState) => {
      dispatch(selectObject(null))

      let state = getState()

      requestAnimationFrame(() => {

        // HACK FIXME don't hardcode these
        let cameraImage = document.querySelector('#camera-canvas').toDataURL()
        let topDownImage = document.querySelector('#top-down-canvas').toDataURL()

        ipcRenderer.send('insertShot', {
          data: serializeState(state),
          images: {
            'camera': cameraImage,
            'topdown': topDownImage
          }
        })

      })
    }
  }
)(

  ({ mainViewCamera, createObject, selectObject, updateModels, loadScene, saveScene, activeCamera, setActiveCamera, resetScene, remoteInput, aspectRatio, saveToBoard, insertAsNewBoard, sceneObjects, selection }) => {
    const largeCanvasRef = useRef(null)
    const smallCanvasRef = useRef(null)
    const [ready, setReady] = useState(false)

    const scene = useRef(new THREE.Scene())
    let [camera, setCamera ] = useState(null)
    const [ machineState, transition ] = useMachine(editorMachine, { log: false })

    const mainViewContainerRef = useRef(null)
    const largeCanvasSize = useComponentSize(mainViewContainerRef)

    const onCanvasPointerDown = event => {
      event.preventDefault()
      event.target.focus()
      // force ortho controls
      // note: dragcontroller grabs pointerdown so this will not fire on perspective camera click
      transition('TYPING_EXIT')
    }

    useEffect(() => {
      // TODO introspect models
      updateModels({})
      setReady(true)
    }, [])

    // render Toolbar with updated camera when scene is ready, or when activeCamera changes
    useEffect(() => {
      setCamera(scene.current.children.find(o => o.userData.id === activeCamera))
    }, [ready, activeCamera])

    return React.createElement(
      SceneContext.Provider,
      { value: { scene: scene.current }},
      h(
        ['div.column', { style: { width: '100%' } }, [
          [Toolbar, { createObject, selectObject, loadScene, saveScene, camera, setActiveCamera, resetScene, saveToBoard, insertAsNewBoard }],

          ['div.row', { style: { flex: 1 }},
            ['div.column', { style: { width: '300px', background: '#111'} },
              ['div#topdown', { style: { height: '300px' } },
                // top-down-canvas
                ['canvas', { key: 'top-down-canvas', tabIndex: 0, ref: smallCanvasRef, id: 'top-down-canvas', style: { width: '100%' }, onPointerDown: onCanvasPointerDown }]
              ],
              ['div#elements', [ElementsPanel, { machineState, transition }]]
            ],

            ['div.column.fill',
              ['div#camera-view', { ref: mainViewContainerRef, style: { paddingTop: `${(1 / aspectRatio) * 100}%` } },
                // camera canvas
                ['canvas', { key: 'camera-canvas', tabIndex: 1, ref: largeCanvasRef, id: 'camera-canvas', onPointerDown: onCanvasPointerDown }]
              ],
              [CameraInspector]
            ],

            //
            // hide presets editor for now
            //
            // ['div.column', [
            //   'div#presets', { style: {
            //     flex: 1,
            //     width: '200px',
            //     backgroundColor: '#eee'
            //   }},
            //   [PresetsEditor, { transition }]
            // ]],

            remoteInput.mouseMode && [PhoneCursor, { remoteInput, camera, largeCanvasRef, selectObject, selectBone, sceneObjects, selection }],
          ]
        ],

        ready && [SceneManager, { mainViewCamera, largeCanvasRef, smallCanvasRef, machineState, transition, largeCanvasSize }],

        !machineState.matches('typing') && [KeyHandler],

        [MenuManager]
      ]
    )
  )
})



const saveScenePresets = state => presetsStorage.saveScenePresets({ scenes: state.presets.scenes })
const PresetsEditor = connect(
  state => ({
    presets: state.presets
  }),
  {
    loadScenePreset: id => (dispatch, getState) => {
      let choice = dialog.showMessageBox(null, {
        type: 'question',
        buttons: ['Yes', 'No'],
        message: 'Your existing scene will be cleared. Are you sure?',
        defaultId: 1 // default to No
      })
      if (choice === 0) {
        let state = getState()
        let preset = state.presets.scenes[id]
        dispatch(loadScene({
          world: preset.state.world,
          sceneObjects: preset.state.sceneObjects,
          activeCamera: preset.state.activeCamera
        }))
      }
    },

    createScenePreset: () => (dispatch, getState) => {
      // show a prompt to get the desired preset name
      let id = THREE.Math.generateUUID()
      prompt({
        title: 'Preset Name',
        label: 'Select a Preset Name',
        value: `Scene ${shortId(id)}`
      }, require('electron').remote.getCurrentWindow()).then(name => {
        if (name != null && name != '' && name != ' ') {
          let state = getState()
          let preset = {
            id,
            name,
            state: {
              world: state.world,
              sceneObjects: state.sceneObjects,
              activeCamera: state.activeCamera
            }
          }
          dispatch(createScenePreset(preset))
          saveScenePresets(getState())
        }
      }).catch(err => {
        console.error(err)
      })
    },

    updateScenePreset: (id, values) => (dispatch, getState) => {
      dispatch(updateScenePreset(id, values))
      saveScenePresets(getState())
    },

    deleteScenePreset: id => (dispatch, getState) => {
      let choice = dialog.showMessageBox(null, {
        type: 'question',
        buttons: ['Yes', 'No'],
        message: 'This scene preset will be deleted. Are you sure?',
        defaultId: 1 // default to No
      })
      if (choice === 0) {
        dispatch(deleteScenePreset(id))
        saveScenePresets(getState())
      }
    }
  }
)(
({ presets, loadScenePreset, createScenePreset, updateScenePreset, deleteScenePreset, transition }) => {
  const onLoadClick = (preset, event) => {
    event.preventDefault()
    loadScenePreset(preset.id)
  }

  const onSaveClick = event => {
    event.preventDefault()
    createScenePreset()
  }

  const onDeleteClick = id => {
    event.preventDefault()
    deleteScenePreset(id)
  }

  const onEditClick = (preset, event) => {
    event.preventDefault()
    updateScenePreset(preset.id, { name: 'ok'})
  }

  const onFocus = event => transition('TYPING_ENTER')
  const onBlur = event => transition('TYPING_EXIT')

  return h([
    'div', { style: { padding: 6 } }, [
      ['h3', { style: { margin: '24px 0 12px 0' } }, 'Preset Scenes'],

      ['ul', Object.values(presets.scenes).map(preset =>
        ['li.element', { style: { display: 'flex', justifyContent: 'space-between' } },

          ['a.select[href=#]', { style: { color: 'white', textDecoration: 'none', display: 'flex', alignSelf: 'center', top: -3, position: 'relative', width: '1.5rem' }, onClick: onLoadClick.bind(this, preset) }, '⇧'],

          [
            'span',
            { style: { flex: 1 } },
            [
              LabelInput,
              {
                key: preset.id,
                label: preset.name != null
                  ? preset.name
                  : `Preset ${shortId(preset.id)}`,
                onFocus,
                onBlur,
                setLabel: name => {
                  updateScenePreset(preset.id, { name })
                }
              }
            ]
          ],


          ['a.delete[href=#]', { onClick: onDeleteClick.bind(this, preset.id) }, 'X']
        ] )
      ],

      ['button', { style: { marginTop: 20, padding: '9px 12px', fontSize: 16 }, onClick: onSaveClick }, '+ Preset'],
    ]
  ])
})

let stats
ipcRenderer.on('shot-generator:menu:view:fps-meter', (event, value) => {
  console.log('shot-generator:menu:view:fps-meter', event, value)
  if (!stats) {
    stats = new Stats()
    stats.showPanel(0)
    document.body.appendChild( stats.dom )
    stats.dom.style.top = '7px'
    stats.dom.style.left = '460px'
  } else {
    document.body.removeChild( stats.dom )
    stats = undefined
  }
})

// setInterval(() => {
//   let count = Object.values(store.getState().sceneObjects).length
//
//   store.dispatch(createObject({
//
//     id: count,
//     type: 'character',
//     height: 1.6,
//     x: 1 + (Math.random() * 0.5),
//     y: 0,
//     z: 0,
//     rotation: -0.8
//
//     // type: 'box',
//     // width: 1,
//     // height: 0.5,
//     // depth: 1,
//     // x: 4,
//     // y: 0.5,
//     // z: 0,
//     // rotation: 0,
//   }))
// }, 1000)
//
// setInterval(() => {
//   // let count = Object.values(store.getState().sceneObjects).length
//   store.dispatch(deleteObject(5))
//   store.dispatch(deleteObject(6))
//   store.dispatch(deleteObject(7))
// }, 3000)

// setInterval(() => {
//   let r = store.getState().sceneObjects[4].rotation
//   store.dispatch(updateObject(4, { rotation: r + 0.1 }))
// }, 1000)

module.exports = Editor
