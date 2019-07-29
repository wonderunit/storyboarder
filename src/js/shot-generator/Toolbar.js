const { connect } = require('react-redux')
const React = require('react')
const { useMemo } = React

const {
  // action creators
  selectObject,
  undoGroupStart,
  undoGroupEnd,
  setActiveCamera,

  // selectors
  getWorld,
  getSceneObjects,
  getActiveCamera
} = require('../shared/reducers/shot-generator')

const SceneObjectCreators = require('../shared/actions/scene-object-creators')

const h = require('../utils/h')

const Icon = require('./Icon')

// TODO DRY
const preventDefault = (fn, ...args) => e => {
  e.preventDefault()
  fn(e, ...args)
}

const Toolbar = connect(
    state => ({
      room: getWorld(state).room,
      cameraState: getSceneObjects(state)[getActiveCamera(state)]
    }),
    {
      selectObject,
      undoGroupStart,
      undoGroupEnd,
      setActiveCamera,

      createCamera: SceneObjectCreators.createCamera,
      createModelObject: SceneObjectCreators.createModelObject,
      createCharacter: SceneObjectCreators.createCharacter,
      createLight: SceneObjectCreators.createLight,
      createVolume: SceneObjectCreators.createVolume
    }
)(
  ({
    // redux state
    room,
    cameraState,

    // action creators
    selectObject,
    undoGroupStart,
    undoGroupEnd,
    setActiveCamera,

    createCamera,
    createModelObject,
    createCharacter,
    createLight,
    createVolume,

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
    const roomObject3dFactory = ({ width, height, length }) => {
      let geometry = new THREE.BoxBufferGeometry(
        width,
        height,
        length
      )
      let material = new THREE.MeshBasicMaterial( { color: 0xff0000, side: THREE.BackSide } )
      let mesh = new THREE.Mesh(geometry, material)
      return mesh
    }
    const roomObject3d = useMemo(
      () => roomObject3dFactory(room),
      [room]
    )

    const onCreateCameraClick = () => {
      let id = THREE.Math.generateUUID()

      undoGroupStart()
      createCamera(id, cameraState, camera)
      selectObject(id)
      setActiveCamera(id)
      undoGroupEnd()
    }

    const onCreateObjectClick = () => {
      let id = THREE.Math.generateUUID()

      undoGroupStart()
      createModelObject(id, camera, room.visible && roomObject3d)
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateCharacterClick = () => {
      let id = THREE.Math.generateUUID()

      undoGroupStart()
      createCharacter(id, camera, room.visible && roomObject3d)
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateLightClick = () => {
      let id = THREE.Math.generateUUID()

      undoGroupStart()
      createLight(id)
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateVolumeClick = () => {
      let id = THREE.Math.generateUUID()

      undoGroupStart()
      createVolume(id)
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
