const THREE = require('three')

const { ipcRenderer, remote } = require('electron')
const { dialog } = remote
const fs = require('fs-extra')
const path = require('path')

const React = require('react')

const { useState, useEffect, useRef, useContext, useMemo, useCallback } = React


const Stats = require('stats.js')
const { VariableSizeList } = require('react-window')
const classNames = require('classnames')
const prompt = require('electron-prompt')

const { createSelector } = require('reselect')

const h = require('../utils/h')
const useComponentSize = require('../hooks/use-component-size')

const  { connect } = require('react-redux')

//const robot = require("robotjs")

const {
  //
  //
  // action creators
  //
  selectObject,
  selectObjectToggle,

  // createObject,
  updateObject,
  deleteObjects,
  groupObjects,
  ungroupObjects,
  mergeGroups,

  duplicateObjects,

  selectBone,
  setMainViewCamera,
  // loadScene,
  // saveScene,
  updateCharacterSkeleton,
  setActiveCamera,
  setCameraShot,
  // resetScene,
  // createScenePreset,
  // updateScenePreset,
  // deleteScenePreset,

  createCharacterPreset,

  // createPosePreset,
  // updatePosePreset,
  // deletePosePreset,

  updateWorld,
  updateWorldRoom,
  updateWorldEnvironment,
  updateWorldFog,
  updateObjects,

  // markSaved,

  toggleWorkspaceGuide,
  undoGroupStart,
  undoGroupEnd,

  //
  //
  // selectors
  //
  // getSerializedState,
  // getIsSceneDirty,

  getSceneObjects,
  getSelections,
  getActiveCamera,
  getSelectedBone,
  getWorld,

  initialState
//} = require('../state')
} = require('../shared/reducers/shot-generator')


//const presetsStorage = require('../presetsStorage')

const ModelLoader = require('../services/model-loader')

const MultiSelectionInspector = require('./MultiSelectionInspector')

const ItemList = require('./components/ItemList').default
const InspectedWorld = require('./components/InspectedWorld').default
const InspectedElement = require('./components/InspectedElement').default
const {NumberSlider, transforms: NumberSliderTransform, formatters: NumberSliderFormatter} = require('./components/NumberSlider')




window.THREE = THREE

// const draggables = (sceneObjects, scene) =>
//   //scene.children.filter(o => o.userData.type === 'object' || o instanceof BoundingBoxHelper)
//   scene.children.filter(o => o.userData.type === 'object' ||
//                               o.userData.type === 'character' ||
//                               o.userData.type === 'light' ||
//                               o.userData.type === 'volume' )

// const cameras = ( scene ) =>
//   scene.children.filter(o => o instanceof THREE.PerspectiveCamera)

const animatedUpdate = (fn) => (dispatch, getState) => fn(dispatch, getState())

// TODO dry
const metersAsFeetAndInches = meters => {
  let heightInInches = meters * 39.3701
  let heightFeet = Math.floor(heightInInches / 12)
  let heightInches = Math.floor(heightInInches % 12)
  return [heightFeet, heightInches]
}

const feetAndInchesAsString = (feet, inches) => `${feet}′${inches}″`

const preventDefault = (fn, ...args) => e => {
  e.preventDefault()
  fn(e, ...args)
}
const SceneContext = React.createContext()

require('../vendor/three/examples/js/loaders/GLTFLoader')
require('../vendor/three/examples/js/loaders/OBJLoader2')
const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
objLoader.setLogging(false, false)
THREE.Cache.enabled = true




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
          'a[href=#][className=object-property-heading]',
          {
            onClick: preventDefault(onStartEditingClick)
          },
          label + ' Properties'
        ]
  )
}


const CHARACTER_HEIGHT_RANGE = {
  character: { min: 1.4732, max: 2.1336 },
  child: { min: 1.003, max: 1.384 },
  baby: { min: 0.492, max: 0.94 }
}

const MORPH_TARGET_LABELS = {
  'mesomorphic': 'Muscular',
  'ectomorphic': 'Skinny',
  'endomorphic': 'Obese',
}

const BoneEditor = ({ sceneObject, bone, updateCharacterSkeleton }) => {
  const [render, setRender] = useState(false)
  // has the user modified the skeleton?
  let rotation = sceneObject.skeleton[bone.name]
    // use the modified skeleton data
    ? sceneObject.skeleton[bone.name].rotation
    // otherwise, use the initial rotation of the bone
    : { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z }

  const createOnSetValue = (key, transform) => value => {
    updateCharacterSkeleton({
      id: sceneObject.id,
      name: bone.name,
      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        [key]: transform(value)
      }
    })
  }

  // the posePresetId and skeleton will change synchronously
  // but the three scene will not have updated bones until SceneManager renders
  // so for now, just wait until that has probably happened :/
  useEffect(() => {
    setRender(false)

    setTimeout(() => {
      setRender(true)
    }, 1)
  }, [sceneObject.posePresetId])

  return h(
    ['div.column', [

      ['div.column', { style: { marginBottom: 3 } }, [
        ['div', { style: { flex: 1, margin: '6px 0 3px 0' } }, 'Bone'],
        ['small', { style: { display: 'flex', flex: 1, marginLeft: 1, fontStyle: 'italic', opacity: 0.8 } }, bone.name]
      ]],

      ['div.column', [
        [NumberSlider,
          {
            label: 'x',
            min: -180,
            max: 180,
            step: 1,
            value: THREE.Math.radToDeg(rotation.x),
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
            value: THREE.Math.radToDeg(rotation.y),
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
            value: THREE.Math.radToDeg(rotation.z),
            onSetValue: createOnSetValue('z', THREE.Math.degToRad),
            transform: NumberSliderTransform.degrees,
            formatter: NumberSliderFormatter.degrees
          }
        ]
      ]]
    ]]
  )
}

const PhoneCursor = connect(
  state => ({
    selections: getSelections(state),
    sceneObjects: getSceneObjects(state),
  }),
  {
    selectObject,
    selectBone,
    updateObject
  })(
    ({ remoteInput, camera, largeCanvasRef, selectObject, selectBone, sceneObjects, selections, selectedBone, updateObject }) => {
      let startingDeviceRotation = useRef(null)
      let startingObjectRotation = useRef(null)
      let startingCameraPosition = useRef(null)
      let startingCameraOffset = useRef(null)
      let startingDirection = useRef(null)
      let tester = useRef(null)
      let isRotating = useRef(false)
      let isDragging = useRef(false)
      let intersectionPlane = useRef(null)
      let mousePosition = useRef(null)
      let virtualMouse = useRef(null)
      let xy = useRef({x:0, y:0})
      let startPosition = useRef(null)
      let viewportwidth = largeCanvasRef.current.clientWidth,
          viewportheight = largeCanvasRef.current.clientHeight
      const rect = largeCanvasRef.current.getBoundingClientRect();

      const { scene } = useContext(SceneContext)

      const setPlanePosition = (obj) => {
        let direction = new THREE.Vector3()
        camera.getWorldDirection( direction )
        let newPos = new THREE.Vector3()
        let dist = 5
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

      useEffect(() => {
        // move mouse here

        if (remoteInput.orbitMode) return
        else {
          if (isDragging.current) {
            isDragging.current = false
          }
        }
        if (camera !== undefined && camera !== null && remoteInput.mouseMode)
        {
          if (camera.parent) scene.current = camera.parent
          if (intersectionPlane.current)
          {
            // intersection plane exists
          } else {
            intersectionPlane.current = new THREE.Mesh(
              //new THREE.CylinderGeometry(1, 1, 40, 16, 2),
              new THREE.PlaneGeometry(100, 100, 2),
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
              new THREE.BoxGeometry(0.01, 0.01, 0.1),
              new THREE.MeshBasicMaterial({color: '#123123' })
            )
            m.position.z = -0.005
            tester.current.position.set(camera.position.x, camera.position.y, camera.position.z)
            tester.current.position.y += 0.05;
            tester.current.quaternion.copy(camera.quaternion)
            tester.current.add(new THREE.AxesHelper(1))
            tester.current.add(m)
            //scene.current.add(tester.current)
          }
        }

        // handling phone rotation to screen position here
        if (remoteInput.mouseMode)
        {
          if (remoteInput.down)
          {
            let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
            if (!isRotating.current) {
              //starting rotation
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
              mousePosition.current = {x: 0, y: 0} //robot.getMousePos()
              virtualMouse.current = {
                x: mousePosition.x,
                y: mousePosition.y
              }
              //
            }
            let w = 0,
              x = 0,
              y = 0,
              z = 1
            let startingDeviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingDeviceRotation.current.beta, startingDeviceRotation.current.alpha, -startingDeviceRotation.current.gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha, -gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
            //startingDeviceQuaternion.multiply(camera.quaternion)
            //deviceQuaternion.multiply(camera.quaternion)
            let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)
            let startingObjectQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingObjectRotation.current.x,startingObjectRotation.current.y,startingObjectRotation.current.z))
            startingObjectQuaternion.multiply(deviceDifference)
            tester.current.quaternion.copy(startingObjectQuaternion)
            let dir = new THREE.Vector3()
            tester.current.updateMatrixWorld()
            tester.current.children[0].getWorldDirection(dir).negate()
            let intersect = findIntersection(camera.position, dir, intersectionPlane.current)
            if (intersect.length>0)
            {
              // let point = new THREE.Mesh(
              //   new THREE.SphereGeometry(0.05),
              //   new THREE.MeshBasicMaterial({color: "#ff0000"})
              // )
              // point.position.copy(intersect[0].point)
              // scene.add(point)

              let xy_coords = toScreenXY( intersect[0].point, camera )
              if (!isRotating.current)
              {
                isRotating.current = true
                firstRun = false
                startPosition.current = {
                  x: xy_coords.x * 300, // * viewportwidth/4,
                  y: xy_coords.y * 300 //* viewportheight/4
                }
              }
              //virtualMouse.current.x = mousePosition.current.x - ((startPosition.current.x - xy_coords.x * viewportwidth/4)/2)
              //virtualMouse.current.y = mousePosition.current.y - ((startPosition.current.y - xy_coords.y * viewportheight/4)/2)
              virtualMouse.current.x = mousePosition.current.x - ((startPosition.current.x - xy_coords.x * 300)/2)
              virtualMouse.current.y = mousePosition.current.y - ((startPosition.current.y - xy_coords.y * 300)/2)
              //robot.moveMouse(virtualMouse.current.x, virtualMouse.current.y)
            }
          } else {
            if (scene.current && tester.current!=null)
            {
              if (isRotating.current)
              {
                isRotating.current = false
                //robot.mouseClick()
              }

              scene.current.remove(tester.current)
              scene.current.remove(intersectionPlane.current)
              tester.current = null
              intersectionPlane.current = null
            }
          }
        } else {
          // not in mouse mode
          if (scene.current && tester.current!=null)
          {
            if (isRotating.current)
            {
              isRotating.current = false
              //robot.mouseClick()
            }

            scene.current.remove(tester.current)
            scene.current.remove(intersectionPlane.current)
            tester.current = null
            intersectionPlane.current = null
          }
        }

      }, [remoteInput, selections])


      useEffect(() => {
        // handling phone rotation to camera orbit
        if (!remoteInput.orbitMode)
        {
          if (isDragging.current) {
            //robot.mouseToggle("up", "left")
            isDragging.current = false
            isRotating.current = false
          }
          return
        }
        if ( camera !== undefined && camera !== null )
        {
          if (camera.parent) scene.current = camera.parent
        }

        if (remoteInput.orbitMode)
        {
          let firstRun = false
          let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
          if (!isDragging.current) {
            //starting rotation
            firstRun = true
            isDragging.current = true
            startingCameraPosition.current = camera.position.clone()
            startingDirection.current = new THREE.Vector3()
            camera.getWorldDirection(startingDirection.current)
            startingDeviceRotation.current = {
              alpha: alpha,
              beta: beta,
              gamma: gamma
            }
            mousePosition.current = {x: 0, y: 0} //robot.getMousePos()
            virtualMouse.current = {
              x: mousePosition.x,
              y: mousePosition.y
            }

          }
          let w = 0,
            x = 0,
            y = 0,
            z = 1
          let startingDeviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingDeviceRotation.current.beta, startingDeviceRotation.current.alpha, -startingDeviceRotation.current.gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
          let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha, -gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))

          let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)

          let rot = new THREE.Euler().setFromQuaternion(deviceDifference)

          let direction = new THREE.Vector3()
          camera.getWorldDirection( direction )

          let objInScene = scene.children.find(o => o.userData.id === selections[0])

          let newPos = new THREE.Vector3()
          let getDistanceToPosition = new THREE.Vector3()
          if (sceneObjects[selections[0]] && (sceneObjects[selections[0]].type === 'object' || sceneObjects[selections[0]].type === 'character'))
          {
            getDistanceToPosition = objInScene.position.clone()
            if (selectedBone)
            {
              let skel = objInScene.userData.skeleton// (objInScene.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
              let realBone = skel.bones.find(bone => bone.uuid == selectedBone)
              let bonePosition = new THREE.Vector3()
              realBone.getWorldPosition( bonePosition )
              getDistanceToPosition = bonePosition.clone()
            }
          }
          let dist = (sceneObjects[selections[0]] && (sceneObjects[selections[0]].type === 'object' || sceneObjects[selections[0]].type === 'character')) ? startingCameraPosition.current.distanceTo(getDistanceToPosition) : 3
          newPos.addVectors ( startingCameraPosition.current, direction.multiplyScalar( dist ) )
          if (firstRun)
          {
            firtRun = false
            startingCameraOffset.current = newPos
          }

          let radPerPixel = (Math.PI / 30),
            center = startingCameraOffset.current
            deltaPhi = radPerPixel * rot.y,
            deltaTheta = -radPerPixel * rot.x,
            campos = new THREE.Vector3(startingCameraPosition.current.x, startingCameraPosition.current.y, startingCameraPosition.current.z),
            pos = camera.position.clone().sub(center),
            radius = dist,
            theta = Math.acos(pos.y / radius),
            phi = Math.atan2(pos.z, pos.x)

          theta = Math.min(Math.max(theta - deltaTheta, 0), Math.PI)
          phi -= deltaPhi
          pos.x = radius * Math.sin(theta) * Math.cos(phi);
          pos.z = radius * Math.sin(theta) * Math.sin(phi);
          pos.y = radius * Math.cos(theta)

          //TODO limit y position to 0 (ground level)
          pos.add(center)

          let cam = {
            x: pos.x,
            y: pos.y,
            z: pos.z,
          }
          let testCam = new THREE.PerspectiveCamera()
          testCam.position.copy(cam)
          testCam.lookAt(startingCameraOffset.current)

          let cameraId = camera.userData.id
          let euler = new THREE.Euler()
          euler.setFromQuaternion( testCam.quaternion.clone().normalize(), "YXZ" )

          if (cam.y < 0) cam.y = 0
          cam.y = cam.y > startingCameraOffset.current.y + radius - radius/20 ? startingCameraOffset.current.y + radius - radius/20 : cam.y

          updateObject(cameraId, {
            x: cam.x,
            y: cam.z,
            z: cam.y,
            rotation: euler.y,
            tilt: euler.x,
            // roll: camera.rotation.z
          })

        } else {
          // not in orbit mouse mode
          if (scene.current && tester.current!=null)
          {
            if (isDragging.current)
            {
              isDragging.current = false
            }
            scene.current.remove(tester.current)
            scene.current.remove(intersectionPlane.current)
            tester.current = null
            intersectionPlane.current = null
          }
        }
      }, [remoteInput])

      return h(
        ['div#phoneCursor', { key: 'cursor' } ,
          [
          ]
        ]
      )
    })

const getClosestCharacterInView = (objects, camera) => {
  let obj = null
  let dist = 1000000
  let allDistances = []

  for (var char of objects) {
    let d = camera.position.distanceTo(
      new THREE.Vector3(char.position.x, camera.position.y, char.position.z))

    allDistances.push({
      object: char,
      distance: d
    })
  }

  let compare = (a, b) => {
    if (a.distance < b.distance)
      return -1;
    if (a.distance > b.distance)
      return 1;
    return 0;
  }

  allDistances.sort(compare)

  for (var i = 0; i< allDistances.length; i++) {
    if (checkIfCharacterInCameraView(allDistances[i].object, camera))
      return allDistances[i]
  }

  return {
    object: obj,
    distance: dist !== 1000000 ? dist : 0
  }
}

const checkIfCharacterInCameraView = (character, camera) => {
  camera.updateMatrix()
  camera.updateMatrixWorld()
  var frustum = new THREE.Frustum()
  frustum.setFromMatrix(
    new THREE.Matrix4()
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))

  for (var hitter of character.bonesHelper.hit_meshes) {
    if (frustum.intersectsBox(new THREE.Box3().setFromObject( hitter ))) {
      return true
    }
  }
  return false
}

const ClosestObjectInspector = ({ camera, sceneObjects, characters }) => {
  const [result, setResult] = useState('')

  useEffect(() => {
    // HACK
    // we're delaying 1 frame until scene is guaranteed to be updated
    // wrap in a try/catch because the scene might not have the same characters
    // by the time we actually render
    // if we get an error in hit testing against empty objects, just ignore it
    requestAnimationFrame(() => {
      try {
        let closest = getClosestCharacterInView(characters, camera)

        let meters = parseFloat(Math.round(closest.distance * 100) / 100).toFixed(2)

        let sceneObject = closest.object ? sceneObjects[closest.object.userData.id] : undefined

        setResult(sceneObject
          ? `Distance to ${sceneObject.name || sceneObject.displayName}: ${meters}m`
          : '')

      } catch (err) {
        setResult('')
      }
    })
  }, [camera, sceneObjects, characters])

  return h(['div.camera-inspector__nearest-character', result])
}

const CameraInspector = connect(
  state => ({
    sceneObjects: getSceneObjects(state),
    activeCamera: getActiveCamera(state)
  })
)(
  React.memo(({ camera, sceneObjects, activeCamera }) => {
    const { scene } = useContext(SceneContext)

    if (!camera) return h(['div.camera-inspector'])

    let cameraState = sceneObjects[activeCamera]

    let tiltInDegrees = Math.round(cameraState.tilt * THREE.Math.RAD2DEG)

    let meters = parseFloat(Math.round(cameraState.z * 100) / 100).toFixed(2)

    let cameraNumber = Object.values(sceneObjects)
                        .filter(o => o.type === 'camera')
                        .indexOf(cameraState) + 1

    let cameraName = cameraState.name || `Camera ${cameraNumber}`

    let fakeCamera = camera.clone() // TODO reuse a single object
    fakeCamera.fov = cameraState.fov
    let focalLength = fakeCamera.getFocalLength()
    fakeCamera = null

    return h(
      ['div.camera-inspector',

        ['div.row',
          { style: { justifyContent: 'space-between' } },
          [
            'div',
            `${cameraName}, ${Math.round(focalLength)}mm, f/1.4`,
            ['br'],
            `Height: ${meters}m Tilt: ${tiltInDegrees}°`,
            ['br'],
            [ClosestObjectInspector, {
              camera,
              sceneObjects,
              characters: scene.children.filter(o => o.userData.type === 'character')
            }]
          ]
        ]
        // [RemoteInputView, { remoteInput }]
      ]
    )
  }
))

// const { durationOfWords } = require('../utils')

// TODO move selector logic into reducers/shot-generator?
// memoized selectors

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

// TODO move to selectors file
const getLoadableSceneObjects = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects)
    .filter(sceneObject =>
      (sceneObject.type === 'character' || sceneObject.type === 'object') &&
      sceneObject.loaded != null
    )
)
const getLoadableSceneObjectsRemaining = createSelector(
  [getLoadableSceneObjects],
  loadableSceneObjects => loadableSceneObjects.filter(sceneObject => sceneObject.loaded === false)
)

const LoadingStatus = connect(
  state => ({
    storyboarderFilePath: state.meta.storyboarderFilePath,
    remaining: getLoadableSceneObjectsRemaining(state),
    attachments: state.attachments
  })
)(React.memo(({ ready, remaining, attachments, storyboarderFilePath }) => {
  let message

  let inprogress = remaining.filter(loadable => {
    let filepathForModel = ModelLoader.getFilepathForModel(loadable, { storyboarderFilePath })
    if (attachments[filepathForModel]) {
      // in cache but in progress
      return attachments[filepathForModel].status === 'NotAsked' || attachments[filepathForModel].status === 'Loading'
    } else {
      // not even in cache yet
      return true
    }
  })

  if (!ready) {
    message = 'Initializing Shot Generator …'
  } else if (inprogress.length) {
    message = 'Loading models …'
  }

  if (!message) return null

  return h(
    ['div.modal-overlay', [
      ['div.modal', [
        ['div.modal__content', [
          ['div.title', 'Loading'],
          ['div.message', message]
        ]]
      ]]
    ]]
  )

}))

// const saveScenePresets = state => presetsStorage.saveScenePresets({ scenes: state.presets.scenes })
// const PresetsEditor = connect(
//   state => ({
//     presets: state.presets
//   }),
//   {
//     loadScenePreset: id => (dispatch, getState) => {
//       let choice = dialog.showMessageBox(null, {
//         type: 'question',
//         buttons: ['Yes', 'No'],
//         message: 'Your existing scene will be cleared. Are you sure?',
//         defaultId: 1 // default to No
//       })
//       if (choice === 0) {
//         let state = getState()
//         let preset = state.presets.scenes[id]
//         dispatch(loadScene({
//           world: preset.state.world,
//           sceneObjects: preset.state.sceneObjects,
//           activeCamera: preset.state.activeCamera
//         }))
//       }
//     },
//
//     createScenePreset: () => (dispatch, getState) => {
//       // show a prompt to get the desired preset name
//       let id = THREE.Math.generateUUID()
//       prompt({
//         title: 'Preset Name',
//         label: 'Select a Preset Name',
//         value: `Scene ${shortId(id)}`
//       }, require('electron').remote.getCurrentWindow()).then(name => {
//         if (name != null && name != '' && name != ' ') {
//           let state = getState()
//           let preset = {
//             id,
//             name,
//             state: {
//               // TODO
//               world: state.world,
//               sceneObjects: getSceneObjects(state),
//               activeCamera: getActiveCamera(state)
//             }
//           }
//           dispatch(createScenePreset(preset))
//           saveScenePresets(getState())
//         }
//       }).catch(err => {
//         console.error(err)
//       })
//     },
//
//     updateScenePreset: (id, values) => (dispatch, getState) => {
//       dispatch(updateScenePreset(id, values))
//       saveScenePresets(getState())
//     },
//
//     deleteScenePreset: id => (dispatch, getState) => {
//       let choice = dialog.showMessageBox(null, {
//         type: 'question',
//         buttons: ['Yes', 'No'],
//         message: 'This scene preset will be deleted. Are you sure?',
//         defaultId: 1 // default to No
//       })
//       if (choice === 0) {
//         dispatch(deleteScenePreset(id))
//         saveScenePresets(getState())
//       }
//     }
//   }
// )(
// ({ presets, loadScenePreset, createScenePreset, updateScenePreset, deleteScenePreset, transition }) => {
//   const onLoadClick = (preset, event) => {
//     event.preventDefault()
//     loadScenePreset(preset.id)
//   }
//
//   const onSaveClick = event => {
//     event.preventDefault()
//     createScenePreset()
//   }
//
//   const onDeleteClick = id => {
//     event.preventDefault()
//     deleteScenePreset(id)
//   }
//
//   const onEditClick = (preset, event) => {
//     event.preventDefault()
//     updateScenePreset(preset.id, { name: 'ok'})
//   }
//
//   const onFocus = event => transition('TYPING_ENTER')
//   const onBlur = event => transition('TYPING_EXIT')
//
//   return h([
//     'div', { style: { padding: 6 } }, [
//       ['h3', { style: { margin: '24px 0 12px 0' } }, 'Preset Scenes'],
//
//       ['ul', Object.values(presets.scenes).map(preset =>
//         ['li.element', { style: { display: 'flex', justifyContent: 'space-between' } },
//
//           ['a.select[href=#]', { style: { color: 'white', textDecoration: 'none', display: 'flex', alignSelf: 'center', top: -3, position: 'relative', width: '1.5rem' }, onClick: onLoadClick.bind(this, preset) }, '⇧'],
//
//           [
//             'span',
//             { style: { flex: 1 } },
//             [
//               LabelInput,
//               {
//                 key: preset.id,
//                 label: preset.name != null
//                   ? preset.name
//                   : `Preset ${shortId(preset.id)}`,
//                 onFocus,
//                 onBlur,
//                 setLabel: name => {
//                   updateScenePreset(preset.id, { name })
//                 }
//               }
//             ]
//           ],
//
//
//           ['a.delete[href=#]', { onClick: onDeleteClick.bind(this, preset.id) }, 'X']
//         ] )
//       ],
//
//       ['button', { style: { marginTop: 20, padding: '9px 12px', fontSize: 16 }, onClick: onSaveClick }, '+ Preset'],
//     ]
//   ])
// })

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

module.exports = {
  SceneContext,
  CameraInspector,
  MenuManager,
  PhoneCursor,

  preventDefault,
  animatedUpdate,
  gltfLoader,

  stats
}
