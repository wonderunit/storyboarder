const { connect } = require('react-redux')

const {
  // action creators
  createObject,
  selectObject,
  undoGroupStart,
  undoGroupEnd,
  setActiveCamera,

  // selectors
  getWorld,
  getSceneObjects,
  getActiveCamera
} = require('../shared/reducers/shot-generator')

// all pose presets (so we can use `stand` for new characters)
const defaultPosePresets = require('../shared/reducers/shot-generator-presets/poses.json')

// id of the pose preset used for new characters
const DEFAULT_POSE_PRESET_ID = '79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE'

const h = require('../utils/h')

const Icon = require('./Icon')

// TODO DRY
const preventDefault = (fn, ...args) => e => {
  e.preventDefault()
  fn(e, ...args)
}

// TODO solve case where near a wall
const generatePositionAndRotation = (camera, room) => {
  let direction = new THREE.Vector3()
  camera.getWorldDirection( direction )

  // place 5 meters away from the camera
  // TODO limit based on room bounds?
  let center = new THREE.Vector3().addVectors( camera.position, direction.multiplyScalar( 5 ) )

  let obj = new THREE.Object3D()
  obj.position.set(center.x, 0, center.z)
  obj.position.x += (Math.random() * 2 - 1) * 0.3 // offset by +/- 0.3m
  obj.position.z += (Math.random() * 2 - 1) * 0.3 // offset by +/- 0.3m
  obj.lookAt(camera.position)

  let euler = new THREE.Euler()
    .setFromQuaternion(
      obj.quaternion.clone().normalize(),
      'YXZ'
    )

  return {
    x: obj.position.x,
    y: obj.position.z,
    z: obj.position.y,
    rotation: euler.y
  }
}

const Toolbar = connect(
    state => ({
      room: getWorld(state).room,
      cameraState: getSceneObjects(state)[getActiveCamera(state)]
    }),
    {
      createObject,
      selectObject,
      undoGroupStart,
      undoGroupEnd,
      setActiveCamera
    }
)(
  ({
    // redux state
    room,
    cameraState,

    // action creators
    createObject,
    selectObject,
    undoGroupStart,
    undoGroupEnd,
    setActiveCamera,

    // props
    camera,

    saveToBoard,
    insertAsNewBoard,
    xrServerUrl

    // unused
    //  resetScene,
    //  loadScene,
    //  saveScene,
  }) => {
    const onCreateCameraClick = () => {
      let id = THREE.Math.generateUUID()

      let { x, y, z } = camera.position

      let rot = new THREE.Euler().setFromQuaternion( camera.quaternion, "YXZ" )
      let rotation = rot.y
      let tilt = rot.x
      let roll = rot.z

      // TODO base on current camera rotation so offset is always left-ward
      // offset by ~3 feet
      x -= 0.91

      let object = {
        id,
        type: 'camera',

        fov: cameraState.fov,

        x, y: z, z: y,
        rotation, tilt, roll
      }

      undoGroupStart()
      createObject(object)
      selectObject(id)
      setActiveCamera(id)
      undoGroupEnd()
    }

    const onCreateObjectClick = () => {
      let id = THREE.Math.generateUUID()
      let { x, y, z, rotation } = generatePositionAndRotation(camera, room)

      undoGroupStart()
      createObject({
        id,
        type: 'object',
        model: 'box',

        width: 1, height: 1, depth: 1,

        x, y, z,

        rotation: { x: 0, y: rotation, z: 0 },

        visible: true
      })
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateCharacterClick = () => {
      let id = THREE.Math.generateUUID()

      let { x, y, z, rotation } = generatePositionAndRotation(camera, room)

      undoGroupStart()
      createObject({
        id,
        type: 'character',
        height: 1.8,
        model: 'adult-male',

        x, y, z,
        rotation,

        headScale: 1,

        morphTargets: {
          mesomorphic: 0,
          ectomorphic: 0,
          endomorphic: 0
        },

        posePresetId: DEFAULT_POSE_PRESET_ID,
        skeleton: defaultPosePresets[DEFAULT_POSE_PRESET_ID].state.skeleton,

        visible: true
      })
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateLightClick = () => {
      let id = THREE.Math.generateUUID()

      undoGroupStart()
      createObject({
        id,
        type: 'light',

        x: 0, y: 0, z: 2,
        rotation: 0, tilt: 0, roll: 0,

        intensity: 0.8,
        visible: true,
        angle: 1.04,
        distance: 5,
        penumbra: 1.0,
        decay: 1,
      })
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateVolumeClick = () => {
      let id = THREE.Math.generateUUID()

      undoGroupStart()
      createObject({
        id,
        type: 'volume',

        x: 0, y: 2, z: 0,

        width: 5, height: 5, depth: 5,

        rotation: 0,

        visible: true,
        opacity: 0.3,
        color: 0x777777,
        numberOfLayers: 4,
        distanceBetweenLayers: 1.5,
        volumeImageAttachmentIds: ['rain2', 'rain1']
      })
      selectObject(id)
      undoGroupEnd()
    }

    // const onCreateStressClick = () => {
    //   undoGroupStart()
    //   for (let i = 0; i < 500; i++) {
    //     onCreateObjectClick()
    //   }
    //   for (let i = 0; i < 20; i++) {
    //     onCreateCharacterClick()
    //   }
    //   undoGroupEnd()
    //   setTimeout(() => {
    //     console.log(Object.values(getSceneObjects($r.store.getState())).length, 'scene objects')
    //   }, 100)
    // }

    // const onLoadClick = () => {
    //   let filepaths = dialog.showOpenDialog(null, {})
    //   if (filepaths) {
    //     let filepath = filepaths[0]
    //     let choice = dialog.showMessageBox(null, {
    //       type: 'question',
    //       buttons: ['Yes', 'No'],
    //       message: 'Your existing scene will be cleared to load the file. Are you sure?',
    //       defaultId: 1 // default to No
    //     })
    //     if (choice === 0) {
    //       try {
    //         let data = JSON.parse(
    //           fs.readFileSync(filepath)
    //         )
    //         loadScene(data)
    //       } catch (err) {
    //         console.error(err)
    //         dialog.showMessageBox(null, {
    //           message: 'Sorry, an error occurred.'
    //         })
    //       }
    //     }
    //   }
    // }

    /*
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
    */

    // const onClearClick = () => {
    //   let choice = dialog.showMessageBox(null, {
    //     type: 'question',
    //     buttons: ['Yes', 'No'],
    //     message: 'Your existing scene will be cleared. Are you sure?',
    //     defaultId: 1 // default to No
    //   })
    //   if (choice === 0) {
    //     resetScene()
    //   }
    // }

    const onSaveToBoardClick = () => {
      saveToBoard()
    }

    const onInsertNewBoardClick = () => {
      insertAsNewBoard()
    }

    const onOpenVR = preventDefault(() =>
      notifications.notify({
        message: `To view, open a VR web browser to:\n<a href="${xrServerUrl}">${xrServerUrl}</a>`,
        timing: 30,
        onClick: () => require('electron').shell.openExternal(xrServerUrl)
      })
    )

    return h(
      ['div#toolbar', { key: 'toolbar' },
        ['div.toolbar__addition.row', [
          ['a[href=#]', { onClick: preventDefault(onCreateCameraClick) }, [[Icon, { src: 'icon-toolbar-camera' }], 'Camera']],
          ['a[href=#]', { onClick: preventDefault(onCreateObjectClick) }, [[Icon, { src: 'icon-toolbar-object' }], 'Object']],
          ['a[href=#]', { onClick: preventDefault(onCreateCharacterClick) }, [[Icon, { src: 'icon-toolbar-character' }], 'Character']],
          ['a[href=#]', { onClick: preventDefault(onCreateLightClick) }, [[Icon, { src: 'icon-toolbar-light' }], 'Light']],
          ['a[href=#]', { onClick: preventDefault(onCreateVolumeClick) }, [[Icon, { src: 'icon-toolbar-volume' }], 'Volume']]
        ]],
        // ['a[href=#]', { onClick: preventDefault(onCreateStressClick) }, '+ STRESS'],

        // ['a[href=#]', { onClick: preventDefault(onClearClick) }, 'Clear'],
        // ['a[href=#]', { onClick: preventDefault(onLoadClick) }, 'Load'],
        // ['a[href=#]', { onClick: preventDefault(onSaveClick) }, 'Save'],

        ['div.toolbar__board-actions.row', [
          xrServerUrl ? ['a[href=#]', { onClick: preventDefault(onOpenVR) }, 'Open in VR'] : [],
          ['a[href=#]', { onClick: preventDefault(onSaveToBoardClick) }, [[Icon, { src: 'icon-toolbar-save-to-board' }], 'Save to Board']],
          ['a[href=#]', { onClick: preventDefault(onInsertNewBoardClick) }, [[Icon, { src: 'icon-toolbar-insert-as-new-board' }], 'Insert As New Board']],
        ]]
      ]
    )

  }
)

module.exports = Toolbar
