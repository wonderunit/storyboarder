const THREE = require('three')

const { ipcRenderer } = require('electron')
const { dialog } = require('electron').remote
const fs = require('fs')
const path = require('path')

const React = require('react')
const { useState, useEffect, useRef, useContext } = React
const { Provider, connect } = require('react-redux')
const ReactDOM = require('react-dom')
// const Stats = require('stats.js')
const { VariableSizeList } = require('react-window')
const prompt = require('electron-prompt')

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

const BonesHelper = require('./BonesHelper')
const BoundingBoxHelper = require('./BoundingBoxHelper')

const ModelLoader = require('../services/model-loader')

const presetsStorage = require('../shared/store/presetsStorage')
//const presetsStorage = require('../presetsStorage')

const WorldObject = require('./World')


require('../vendor/OutlineEffect.js')
const RoundedBoxGeometry = require('three-rounded-box')(THREE)


window.THREE = THREE

const draggables = (sceneObjects, scene) =>
  scene.children.filter(o => o.userData.type === 'object' || o instanceof BoundingBoxHelper)

// const stats = new Stats()
// stats.showPanel(0)
// document.body.appendChild( stats.dom )

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
    aspectRatio: state.aspectRatio
  }),
  {
    updateObject,
    selectObject,
    animatedUpdate,
    selectBone,
    updateCharacterSkeleton
  }
)(
  ({ world, sceneObjects, updateObject, selectObject, remoteInput, largeCanvasRef, smallCanvasRef, selection, selectedBone, machineState, transition, animatedUpdate, selectBone, mainViewCamera, updateCharacterSkeleton, largeCanvasSize, activeCamera, aspectRatio }) => {
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

    let clock = useRef(new THREE.Clock())

    let orthoCamera = useRef(new THREE.OrthographicCamera( -4, 4, 4, -4, 0, 1000 ))

    let cameraHelper = useRef(null)

    useEffect(() => {
      console.log('new SceneManager')

      scene.background = new THREE.Color(0xFFFFFF)
      scene.add(new THREE.AmbientLight(0x161616, 1))

      let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1)
      directionalLight.position.set(0, 1, 3)
      scene.add(directionalLight)

      orthoCamera.current.position.y = 100
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

      // determine the bounding box containging all scene objects
      let bbox = new THREE.Box3()
      for (child of scene.children) {
        if (
          child instanceof BoundingBoxHelper ||
          child instanceof THREE.SkinnedMesh ||
          child instanceof THREE.Mesh
        ) {
          if (child.userData.type !== 'ground') {
            bbox.expandByObject(child)
          }
        } else if (
          child instanceof THREE.Camera
        ) {
          bbox.expandByPoint(child.position)
        }
      }
      let wi = (bbox.max.x - bbox.min.x)
      let hi = (bbox.max.z - bbox.min.z)
      let ri = wi / hi

      // target aspect ratio
      let rs = (mainViewCamera === 'live')
        ? 1
        : aspectRatio // 2.35

      let [w, h] = rs > ri
        ? [hi * rs, hi]
        : [wi, wi / rs]

      orthoCamera.current.left = -w
      orthoCamera.current.right = w
      orthoCamera.current.top = h
      orthoCamera.current.bottom = -h

      orthoCamera.current.updateProjectionMatrix()

      // console.log(
      //   'bounds  w', wi.toFixed(3),
      //   'bounds  h', hi.toFixed(3),
      //   'bounds ar', ri.toFixed(3),
      //   'view   ar', rs.toFixed(3),
      //   'w', w.toFixed(3),
      //   'h', h.toFixed(3)
      // )

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
          // stats.begin()
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
                  tilt: cameraState.tilt
                }

                // step
                cameraControlsView.current.update( clock.current.getDelta(), state )

                // TODO only call updateObject if camera object props we care about actually changed
                //
                // update object state with the latest values
                let cameraId = camera.userData.id
                let { x, y, z, rotation, tilt } = cameraControlsView.current.object

                updateObject(cameraId, {
                  x,
                  y,
                  z,
                  rotation,
                  tilt
                })
              }

              cameraHelper.current.visible = state.mainViewCamera === 'live'
                ? false
                : true
              if (bonesHelper.current) { scene.add(bonesHelper.current) }

              if (state.mainViewCamera === 'live') {
                largeRendererEffect.current.render(scene, cameraForLarge)
              } else {
                largeRenderer.current.render(scene, cameraForLarge)
              }


              if (bonesHelper.current) { scene.remove(bonesHelper.current) }

              cameraHelper.current.update()
              cameraHelper.current.visible = state.mainViewCamera === 'live'
                ? true
                : false
              smallRenderer.current.render(scene, cameraForSmall)
            })
          }
          // stats.end()
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
      let sceneObject = null
      let child = null

      if (selection != null) {
        child = scene.children.find(o => o.userData.id === selection)
        sceneObject = sceneObjects[selection]
        if (child && child.children[0] && (child.children[0].skeleton || child.children[1].skeleton) && sceneObject.visible) {
          //console.log('child: ', child)
          let skel = (child.children[0] instanceof THREE.Mesh) ? child.children[0] : child.children[1]

          if (
            // there is not a BonesHelper instance
            !bonesHelper.current ||
            // or, there is a BonesHelper instance pointing to the wrong object
            bonesHelper.current.root !== skel.skeleton.bones[0]
          ) {
            //console.log('do we need a new bone structure? : ', (skel))
            bonesHelper.current = new BonesHelper(skel.skeleton.bones[0])
            //console.log('creating a new bone structure: ', bonesHelper.current)
          }
        } else {
          bonesHelper.current = null
        }
      } else {
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
        // console.log('scene objects changed, updating controls')

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

    const characterModels = ModelLoader.getCharacterModels()
    const objModels = ModelLoader.getObjModels()

    // HACK very basic check
    const hasModels = Object.values(objModels).length && Object.values(characterModels).length

    const components = Object.values(sceneObjects).map(props => {
        switch (props.type) {
          case 'object':
            return [
              SceneObject, {
                key: props.id,
                scene,

                objModels,

                isSelected: props.id === selection,

                ...props
              }
            ]

          case 'character':
            return [
              Character, {
                key: props.id,
                scene,

                remoteInput,
                characterModels,
                isSelected: selection === props.id,
                selectedBone,

                camera,

                updateCharacterSkeleton,
                updateObject,

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
        }
    })

    const worldComponent = [WorldObject, { key: 'world', world, scene }]

    // TODO Scene parent object?
    return hasModels
      ? [[worldComponent, ...components].map(c => h(c))]
      : null
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

const SceneObject = React.memo(({ scene, id, type, objModels, isSelected, ...object }) => {
  let mesh = useRef(null)

  let boxRadius = .005
  let boxRadiusSegments = 5

  const update = () => {
    mesh.current.position.x = object.x
    mesh.current.position.z = object.y
    mesh.current.position.y = object.z
    mesh.current.rotation.y = object.rotation
    mesh.current.userData.id = id
    mesh.current.userData.type = type
    if (type === 'object' && object.model === 'box') {
      mesh.current.geometry = new RoundedBoxGeometry( object.width, object.height, object.depth, boxRadius, boxRadiusSegments )
      mesh.current.geometry.translate( 0, object.height / 2, 0 )
    }
    mesh.current.visible = object.visible
  }

  useEffect(() => {
    console.log(type, id, 'model changed', mesh.current, 'to', object.model)

    if (object.model === 'tree') {
      mesh.current = objModels.tree.clone()

    } else if (object.model === 'chair') {
      mesh.current = objModels.chair.clone()

    } else {
      geometry = new RoundedBoxGeometry( object.width, object.height, object.depth, boxRadius, boxRadiusSegments )
      let material = new THREE.MeshBasicMaterial( { color: 0xcccccc, side: THREE.DoubleSide } )
      mesh.current = new THREE.Mesh( geometry, material )
      geometry.translate( 0, object.height / 2, 0 )
    }

    update()

    console.log(type, id, 'added to scene')
    scene.add(mesh.current)

    return function cleanup () {
      console.log(type, id, 'removed from scene')
      scene.remove(mesh.current)
    }
  }, [object.model])

  useEffect(() => {
    console.log(type, id, 'update')
    update()
  }, [object.x, object.y, object.z, object.rotation, object.width, object.height, object.depth, object.visible])

  useEffect(() => {
    mesh.current.material.userData.outlineParameters =
      isSelected
        ? {
          thickness: 0.015,
          color: [ 0.7, 0.0, 0.0 ]
        }
       : {
         thickness: 0.008,
         color: [ 0, 0, 0 ],
       }
  }, [isSelected])

  return null
})

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

    // TODO do we ever need these?
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

  camera.current.fov = props.fov
  camera.current.updateProjectionMatrix()

  return null
})

const WorldElement = React.memo(({ world, isSelected, selectObject, style = {} }) => {
  const onClick = () => {
    selectObject(null)
  }

  return h([
    'div.element', { className: isSelected ? 'selected' : null, style: { height: ELEMENT_HEIGHT, ...style } }, [
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

  return h(
    isWorld
    ? [
      WorldElement, {
        world: items[0],
        isSelected: selection == null,
        selectObject
      }
    ]
    : [
        Element, {
          style,
          sceneObject,
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
  updateWorldEnvironment
}) => {
  const { scene } = useContext(SceneContext)

  const ref = useRef()

  const onFocus = event => transition('TYPING_ENTER')
  const onBlur = event => transition('TYPING_EXIT')

  let sceneObject = data
  let modelData = sceneObject && sceneObject.model && models[sceneObject.model]

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
            modelData,
            updateObject,
            selectedBone: scene.getObjectByProperty('uuid', selectedBone),
            machineState,
            transition,
            selectBone,
            updateCharacterSkeleton
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
            min: -Math.PI,
            max: Math.PI,
            value: world.environment.rotation,
            onSetValue: rotation => {
              updateWorldEnvironment({ rotation })
            },
            formatter: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
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
      ...types.object
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
            updateWorldEnvironment
          }]
        )
      )
  }
))

const NumberSlider = React.memo(({ label, value, onSetValue, min, max, step, formatter }) => {
  const [fine, setFine] = useState(false)

  min = min == null ? -10 : min
  max = max == null ? 10 : max
  step = step == null ? 0.01 : step

  const onChange = event => {
    event.preventDefault()
    if (fine) {
      let change = parseFloat(event.target.value) - value
      onSetValue(value + (change / 1000))
    } else {
      onSetValue(parseFloat(event.target.value))
    }
  }

  formatter = formatter != null
    ? formatter
    : value => value.toFixed(2)

  useEffect(() => {
    const onKeyDown = event => {
      setFine(event.altKey)
      if (event.key === 'Escape') {
        document.activeElement.blur()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyDown)
    return function cleanup () {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyDown)
    }
  }, [])

  return h([
    'div.number-slider', { style: { display: 'flex', flexDirection: 'row' } }, [
      ['div', { style: { width: 50 } }, label],
      ['input', { style: { flex: 1 }, type: 'range', onChange, min, max, step, value }],
      ['div', { style: { width: 40 } }, formatter(value)]
    ]
  ])
})

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
    defaultCharacterHeights: state.defaultCharacterHeights
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
        //height: state.defaultCharacterHeights[preset.state.model].originalHeight,
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
const InspectedElement = ({ sceneObject, modelData, updateObject, selectedBone, machineState, transition, selectBone, updateCharacterSkeleton }) => {
  const createOnSetValue = (id, name) => value => updateObject(id, { [name]: value })

  let positionSliders = [
    [NumberSlider, { label: 'x', value: sceneObject.x, min: -30, max: 30, onSetValue: createOnSetValue(sceneObject.id, 'x') } ],
    [NumberSlider, { label: 'y', value: sceneObject.y, min: -30, max: 30, onSetValue: createOnSetValue(sceneObject.id, 'y') } ],
    [NumberSlider, { label: 'z', value: sceneObject.z, min: -30, max: 30, onSetValue: createOnSetValue(sceneObject.id, 'z') } ],
  ]

  let volumeSliders = [
    [NumberSlider, { label: 'width', value: sceneObject.width, min: 0.025, max: 5, onSetValue: createOnSetValue(sceneObject.id, 'width') } ],
    [NumberSlider, { label: 'height', value: sceneObject.height, min: 0.025, max: 5, onSetValue: createOnSetValue(sceneObject.id, 'height') } ],
    [NumberSlider, { label: 'depth', value: sceneObject.depth, min: 0.025, max: 5, onSetValue: createOnSetValue(sceneObject.id, 'depth') } ],
  ]

  const onFocus = event => transition('TYPING_ENTER')
  const onBlur = event => transition('TYPING_EXIT')

  return h([
    'div',

      [
        LabelInput,
        {
          key: sceneObject.id,
          label: sceneObject.name != null
            ? sceneObject.name
            : `${sceneObject.type} ${shortId(sceneObject.id)}`,
          onFocus,
          onBlur,
          setLabel: name => {
            updateObject(sceneObject.id, { name })
          }
        }
      ],

      sceneObject.type == 'object' && [
        'select', {
          value: sceneObject.model,
          onChange: event => {
            event.preventDefault()
            updateObject(sceneObject.id, { model: event.target.value })
          }
        }, [
          [['box', 'box'], ['tree', 'tree'], ['chair', 'chair']].map(([name, value]) =>
            ['option', { value }, name]
          )
        ]
      ],

      sceneObject.type == 'character' && [

        // character preset
        [CharacterPresetsEditor, { sceneObject }],

        ['div.row', { style: { margin: '9px 0 6px 0', paddingRight: 9 } },
          ['div', { style: { width: 50, display: 'flex', alignSelf: 'center' } }, 'model'],
          [
            'select', {
              value: sceneObject.model,
              onChange: event => {
                event.preventDefault()
                updateObject(sceneObject.id, { model: event.target.value })
              },
              style: {
                marginBottom: 0
              }
            }, [
              [
                { name: 'Adult Male', value: 'adult-male' },
                { name: 'Adult Female', value: 'adult-female' },
                { name: 'Teen Male', value: 'teen-male' },
                { name: 'Teen Female', value: 'teen-female' },
              ].map(({ name, value }) =>
                ['option', { value }, name]
              )
            ]
          ],
        ]

      ],

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

      ['div',
        [NumberSlider, {
          label: 'rotation',
          min: -Math.PI,
          max: Math.PI,
          value: sceneObject.rotation,
          onSetValue: createOnSetValue(sceneObject.id, 'rotation'),
          formatter: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
        }]
      ],

      sceneObject.type == 'camera' &&
        ['div',
          [NumberSlider, {
            label: 'roll',
            min: -45 * THREE.Math.DEG2RAD,
            max: 45 * THREE.Math.DEG2RAD,
            value: sceneObject.roll,
            onSetValue: createOnSetValue(sceneObject.id, 'roll'),
            formatter: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
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

      sceneObject.type == 'character' && [

        ['div', { style: { flex: 1, paddingBottom: 6 } }, [
          [NumberSlider, { label: 'height', min: 1.4732, max: 2.1336, step: 0.0254, value: sceneObject.height, onSetValue: createOnSetValue(sceneObject.id, 'height'),
            formatter: value => feetAndInchesAsString(...metersAsFeetAndInches(sceneObject.height))
          } ],
          [NumberSlider, { label: 'head', min: 0.8, max: 1.2, step: 0.01, value: sceneObject.headScale, onSetValue: createOnSetValue(sceneObject.id, 'headScale'),
            formatter: value => Math.round(value * 100).toString() + '%'
          } ],
        ]],

        ['div', { style: { margin: '6px 0 3px 0', fontStyle: 'italic' } }, 'morphs'],

        ['div', { style: { flex: 1 } },
          Object.entries(sceneObject.morphTargets).map(([ key, value ]) =>
            [
              NumberSlider,
              {
                label: MORPH_TARGET_LABELS[key],
                min: 0,
                max: 1,
                step: 0.01,
                value: value,
                onSetValue: value => updateObject(sceneObject.id, { morphTargets: { [key]: value } })
              }
            ]
          )
        ],

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

  const createOnSetValue = key => value => {
    updateCharacterSkeleton({
      id: sceneObject.id,
      name: bone.name,
      rotation: {
        x: bone.rotation.x,
        y: bone.rotation.y,
        z: bone.rotation.z,
        [key]: value
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
            min: -Math.PI,
            max: Math.PI,
            step: 0.01,
            value: bone.rotation.x,
            onSetValue: createOnSetValue('x'),
            formatter: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
          }
        ],
        [NumberSlider,
          {
            label: 'y',
            min: -Math.PI,
            max: Math.PI,
            step: 0.01,
            value: bone.rotation.y,
            onSetValue: createOnSetValue('y'),
            formatter: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
          }
        ],
        [NumberSlider,
          {
            label: 'z',
            min: -Math.PI,
            max: Math.PI,
            step: 0.01,
            value: bone.rotation.z,
            onSetValue: createOnSetValue('z'),
            formatter: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
          }
        ]
      ]]
    ]]
  )
}

const ELEMENT_HEIGHT = 40
const Element = React.memo(({ style, sceneObject, isSelected, isActive, onSelectObject, onUpdateObject, deleteObject, setActiveCamera, machineState, transition, allowDelete }) => {
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
    'object': 'OBJ'
  }

  return h([
    'div.element', { className: isSelected ? 'selected' : null, style: { height: ELEMENT_HEIGHT, ...style } }, [
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
                ['span.id', shortId(sceneObject.id)]
              ]
          ),
          isActive && ['span.active', '👀'],
          sceneObject.visible && ['span.visibility', '👁']
        ]
      ],
      allowDelete && ['a.delete[href=#]', { onClick: onDeleteClick }, 'X']
    ]
  ])
})

const PhoneCursor = ({ remoteInput, camera, largeCanvasRef, selectObject, selectBone }) => {
  let startingDeviceRotation = useRef(null)
  let startingObjectRotation = useRef(null)
  let tester = useRef(null)
  let isRotating = useRef(false)
  let intersectionPlane = useRef(null)
  let xy = useRef({x:0, y:0})
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
    //console.log(camera.quaternion)
  }

  const findIntersection = ( origin, ph_direction, obj ) =>
  {
    //console.log('origin: ', origin, ' direction: ', ph_direction, 'obj: ', obj)
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
    if (intersect.object instanceof BoundingBoxHelper) {
      return [intersect.object.object, null]
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
        // intersection plane exists
      } else {
        intersectionPlane.current = new THREE.Mesh(
          //new THREE.CylinderGeometry(1, 1, 40, 16, 2),

          new THREE.PlaneGeometry(50, 30, 2),
          new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} ))
        setPlanePosition(intersectionPlane.current)
        //setCylinderOrientation(intersectionPlane.current)
        //scene.current.add(intersectionPlane.current)
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
        tester.current.add(new THREE.AxesHelper(1))
        tester.current.add(m)
        scene.current.add(tester.current)
      }
    }
  })

  useEffect(() => {
    // habdling phone rotation to screen position here
    if (remoteInput.mouseMode)
    {
      if (remoteInput.down)
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
        let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)
        let startingObjectQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingObjectRotation.current.x,startingObjectRotation.current.y,startingObjectRotation.current.z))
        deviceDifference.multiply(camera.quaternion)
        startingObjectQuaternion.multiply(deviceDifference)
        tester.current.quaternion.copy(startingObjectQuaternion)
        let dir = new THREE.Vector3()
        tester.current.children[0].getWorldDirection(dir).negate()
        let intersect = findIntersection(camera.position, dir, intersectionPlane.current)
        if (intersect.length>0)
        {
          let xy_coords = toScreenXY( intersect[0].point, camera )
          xy_coords.x = xy_coords.x * viewportwidth/4 + viewportwidth/2 - (viewportwidth/2 - oldxy.current.x)
          xy_coords.y = xy_coords.y * viewportheight/4 + viewportheight/2 - (viewportheight/2- oldxy.current.y)
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

  }, [remoteInput])

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
    const sceneObj = scene.children

    var noIntersect = true;
  	var intersects = raycaster.intersectObjects( sceneObj )

    for ( var i = 0; i < intersects.length; i++ ) {
      //console.log('intersection [', i ,']=' , intersects[ i ].object.userData.type)
      if (intersects[i].object.userData.type === 'object' || intersects[i].object.userData.type==='character')
      {
        noIntersect = false;
        let object = getObjectAndBone( intersects[ i ] )
        let hits
        let bone
        if (object[0] && object[0].skeleton) {
          if (bonesHelper.current)
          {

          } else {
            scene.remove(bonesHelper.current)
            bonesHelper.current = new BonesHelper(object[0].skeleton.bones[0])
            selectObject(object[0].userData.id)
            scene.add(bonesHelper.current)
          }
        } else {
          scene.remove(bonesHelper.current)
          bonesHelper.current = null
        }
        if (bonesHelper.current) {
          hits = raycaster.intersectObject( bonesHelper.current )
          bone = hits.length && getObjectAndBone( hits[ 0 ] )[1]
        }
        // ... select bone (if any) ...
        if (camera.isPerspectiveCamera) {
          if (bone) {
            //console.log('trying to select: ', bone)
            selectBone( bone.uuid )
          } else {
            selectBone( null )
          }
        }
      }
    }
    if (noIntersect) {
      if (bonesHelper.current)
      {
        //selectBone( null )
        scene.remove(bonesHelper.current)
        selectObject( null )
        bonesHelper.current = null
      }
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
}

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
      width: 0.5,
      height: 0.5,
      depth: 0.5,
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
    alert('not implemented')
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
    remoteInput: state.input,
    sceneObjects: state.sceneObjects,
    activeCamera: state.activeCamera
  }),
  {
    setMainViewCamera,
    setActiveCamera
  }
)(
  React.memo(({ remoteInput, sceneObjects, mainViewCamera, setMainViewCamera, activeCamera, setActiveCamera }) => {
    const { scene } = useContext(SceneContext)

    let camera = scene.children.find(child => child.userData.id === activeCamera)

    if (!camera) return h(['div#camera-inspector', { style: { padding: 12, lineHeight: 1.25 } }])

    let cameraState = sceneObjects[activeCamera]

    let cameras = Object.values(sceneObjects).filter(o => o.type === 'camera').map(o => ([
      `camera id:${shortId(o.id)}`, o.id
    ]))

    fakeCamera = camera.clone() // TODO reuse a single object
    fakeCamera.fov = cameraState.fov
    let focalLength = fakeCamera.getFocalLength()
    fakeCamera = null

    let tiltInDegrees = Math.round(cameraState.tilt * THREE.Math.RAD2DEG)

    let [heightFeet, heightInches] = metersAsFeetAndInches(cameraState.z)

    return h(
      ['div#camera-inspector', { style: { padding: 12, lineHeight: 1.25 } },

        ['div.row',
          { style: { justifyContent: 'space-between' } },
          [
            'div',
            `Camera 1, ${Math.round(focalLength)}mm, f/1.4`,
            ['br'],
            `Height: ${feetAndInchesAsString(heightFeet, heightInches)} Tilt: ${tiltInDegrees}°`,
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
                ['small', { style: { letterSpacing: '0.1rem' }}, ' (t)'],
                [
                  'a[href=#]',
                  {
                    onClick: event => {
                      event.preventDefault()
                      setMainViewCamera(mainViewCamera === 'ortho' ? 'live' : 'ortho')
                    },
                    style: {

                    }
                  },
                  [
                    'small',
                    'Toggle Large/Small'
                  ]
                ]
              ]
            ]
          ]
        ],
        [RemoteInputView, { remoteInput }]
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

const KeyHandler = connect(
  state => ({
    mainViewCamera: state.mainViewCamera,
    activeCamera: state.activeCamera,
    selection: state.selection,

    // TODO memoized selector
    _cameras: Object.values(state.sceneObjects).filter(o => o.type === 'camera')
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
          if (selection) {
            let choice = dialog.showMessageBox(null, {
              type: 'question',
              buttons: ['Yes', 'No'],
              message: 'Are you sure?',
              defaultId: 1 // default to No
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
    }, [mainViewCamera, _cameras])

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
    aspectRatio: state.aspectRatio
  }),
  {
    createObject,
    selectObject,
    setModels: characterModelDataById => ({ type: 'SET_MODELS', payload: characterModelDataById }),
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
          data: {
            world: state.world,
            sceneObjects: state.sceneObjects,
            activeCamera: state.activeCamera
          },
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
          data: {
            world: state.world,
            sceneObjects: state.sceneObjects,
            activeCamera: state.activeCamera
          },
          images: {
            'camera': cameraImage,
            'topdown': topDownImage
          }
        })

      })
    }
  }
)(

  ({ mainViewCamera, createObject, selectObject, setModels, loadScene, saveScene, activeCamera, setActiveCamera, resetScene, remoteInput, aspectRatio, saveToBoard, insertAsNewBoard }) => {
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
      ModelLoader.init().then(characterModels => {

        //console.log('initing with : ', characterModels )
        let characterModelDataById = Object.entries(characterModels).reduce(
          (coll, [key, model]) => {
            let model1 = (model.children[0] instanceof THREE.Mesh) ? model.children[0] : model.children[1]
            coll[key] = {
              model: model1.toJSON(),
              bones: JSON.parse(JSON.stringify(model1.skeleton.bones)),
              animationIds:model.original ? model1.original.animations.map(animation => animation.name) : null
            }

            return coll
          }, {}
        )
        setModels(characterModelDataById)
        setReady(true)
      })
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

            remoteInput.mouseMode && [PhoneCursor, { remoteInput, camera, largeCanvasRef, selectObject, selectBone }],
          ]
        ],

        ready && [SceneManager, { mainViewCamera, largeCanvasRef, smallCanvasRef, machineState, transition, largeCanvasSize }],

        !machineState.matches('typing') && [KeyHandler]
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
