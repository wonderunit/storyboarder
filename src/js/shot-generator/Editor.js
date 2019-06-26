const fs = require('fs-extra')
const path = require('path')


const { Provider, connect } = require('react-redux')
const React = require('react')
const { useState, useEffect, useRef, useContext, useMemo } = React

const { ipcRenderer, remote } = require('electron')

const log = require('electron-log')

const {
  SceneContext,
  Toolbar,
  Icon,
  ElementsPanel,
  CameraInspector,
  BoardInspector,
  GuidesInspector,
  CamerasInspector,
  KeyHandler,
  MenuManager,
  PhoneCursor,

  preventDefault,
  gltfLoader
} = require('./Components')
const SceneManager = require('./SceneManager')
const GuidesView = require('./GuidesView')

const ModelLoader = require('../services/model-loader')

const h = require('../utils/h')
const useComponentSize = require('../hooks/use-component-size')

const useMachine = require('../hooks/use-machine')
const { Machine } = require('xstate')
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

const {
  //
  //
  // action creators
  //
  selectObject,
  selectObjectToggle,

  createObject,
  updateObject,
  deleteObjects,

  duplicateObjects,

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
  updateWorldEnvironment,

  markSaved,

  toggleWorkspaceGuide,

  undoGroupStart,
  undoGroupEnd,

  getSceneObjects,
  getSelections,
  getActiveCamera,
  getSelectedBone,
  getWorld,

  //
  //
  // selectors
  //
  getSerializedState,
  getIsSceneDirty
//} = require('../state')
} = require('../shared/reducers/shot-generator')

const notifications = require('../window/notifications')

const Editor = connect(
  state => ({
    mainViewCamera: state.mainViewCamera,
    activeCamera: getActiveCamera(state),
    remoteInput: state.input,
    aspectRatio: state.aspectRatio,
    sceneObjects: getSceneObjects(state),
    world: getWorld(state),
    selectedBone: getSelectedBone(state),
    attachments: state.attachments,
    server: state.server
  }),
  {
    createObject,
    selectObject,
    updateModels: payload => ({ type: 'UPDATE_MODELS', payload }),
    loadScene,
    saveScene: filepath => (dispatch, getState) => {
      let state = getState()
      let contents = getSerializedState(state)
      fs.writeFileSync(filepath, JSON.stringify(contents, null, 2))
      dialog.showMessageBox(null, { message: 'Saved!' })
      // dispatch(markSaved())
    },
    setActiveCamera,
    resetScene,

    onBeforeUnload: event => (dispatch, getState) => {
      if (getIsSceneDirty(getState())) {
        // pass electron-specific flag
        // to trigger `will-prevent-unload` on BrowserWindow
        event.returnValue = false
      }
    },

    setMainViewCamera,
    markSaved,

    undoGroupStart,
    undoGroupEnd,

    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
  ({ mainViewCamera, createObject, selectObject, updateModels, loadScene, saveScene, activeCamera, setActiveCamera, resetScene, remoteInput, aspectRatio, sceneObjects, world, selections, selectedBone, onBeforeUnload, setMainViewCamera, withState, attachments, server, undoGroupStart, undoGroupEnd }) => {
    const xrServerUrl = useMemo(() => server.uri && server.uri.replace(/8001$/, '1234'), [server.uri])

    const largeCanvasRef = useRef(null)
    const smallCanvasRef = useRef(null)
    const [ready, setReady] = useState(false)

    const scene = useRef()
    let [camera, setCamera ] = useState(null)
    const [ machineState, transition ] = useMachine(editorMachine, { log: false })

    const mainViewContainerRef = useRef(null)
    const largeCanvasSize = useComponentSize(mainViewContainerRef)

    const onCanvasPointerDown = event => {
      event.preventDefault()
      event.target.focus()
      // force ortho controls
      // note: selection manager grabs pointerdown so this will not fire on perspective camera click
      transition('TYPING_EXIT')
    }

    const onSwapCameraViewsClick = preventDefault(() => {

      setMainViewCamera(mainViewCamera === 'ortho' ? 'live' : 'ortho')

    })

    const onAutoFitClick = preventDefault(() => { alert('TODO autofit (not implemented yet)') })
    const onZoomInClick = preventDefault(() => { alert('TODO zoom in (not implemented yet)') })
    const onZoomOutClick = preventDefault(() => { alert('TODO zoom out (not implemented yet)') })



    // used by onToolbarSaveToBoard and onToolbarInsertAsNewBoard
    const imageRenderer = useRef()

    const renderImagesForBoard = state => {
      if (!imageRenderer.current) {
        imageRenderer.current = new THREE.OutlineEffect(
          new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
        )
      }

      let imageRenderCamera = camera.clone()
      imageRenderCamera.layers.set(0)
      imageRenderCamera.layers.enable(3)


      //
      //
      // Prepare for rendering as an image
      //

      let selected = scene.current.children.find(child =>
          (
            child.userData.type === 'character' ||
            child.userData.type === 'object'
          ) &&
          child.userData.id === getSelections(state)[0])

      let material = selected &&
        ((selected.userData.type === 'character')
          ? selected.userData.mesh.material
          // TODO support multiple child Object3D’s in a Group
          : selected.children[0].material)

      // save memento
      let memento = material && { color: material.userData.outlineParameters.color }




      // override selection outline effect color from selected Object3D’s material
      if (memento) {
        material.userData.outlineParameters.color = [0, 0, 0]
      }




      // render the image
      imageRenderer.current.setSize(Math.ceil(900 * state.aspectRatio), 900)
      imageRenderer.current.render(scene.current, imageRenderCamera)
      let cameraImage = imageRenderer.current.domElement.toDataURL()



      // restore from memento
      if (memento) {
        material.userData.outlineParameters.color = memento.color
      }



      // TODO
      // if (topDownCamera) {
      //   imageRenderer.clear()
      //   imageRenderer.setSize(900, 900)
      //   imageRenderer.render(scene, topDownCamera)
      //   let topDownImage = imageRenderer.domElement.toDataURL()
      // }
      let topDownImage = undefined

      return { cameraImage, topDownImage }
    }

    const onToolbarSaveToBoard = () => {
      withState((dispatch, state) => {
        let { cameraImage } = renderImagesForBoard(state)

        ipcRenderer.send('saveShot', {
          uid: state.board.uid,
          data: getSerializedState(state),
          images: {
            'camera': cameraImage,

            // TODO
            'topdown': undefined
          }
        })

        dispatch(markSaved())
      })
    }
    const onToolbarInsertAsNewBoard = () => {
      withState((dispatch, state) => {
        let { cameraImage } = renderImagesForBoard(state)

        // NOTE we do this first, since we get new data on insertShot complete
        dispatch(markSaved())

        ipcRenderer.send('insertShot', {
          data: getSerializedState(state),
          images: {
            'camera': cameraImage,

            // TODO
            'topdown': undefined
          }
        })
      })
    }



    useEffect(() => {
      scene.current = new THREE.Scene()

      // TODO introspect models
      updateModels({})

      // do any other pre-loading stuff here
      document.fonts.ready.then(() => {
        // let the app know we're ready to render
        setReady(true)
      })

      return function cleanup () {
        scene.current = null
      }
    }, [])

    // render Toolbar with updated camera when scene is ready, or when activeCamera changes
    useEffect(() => {
      setCamera(scene.current.children.find(o => o.userData.id === activeCamera))
    }, [ready, activeCamera])

    useEffect(() => {
      window.addEventListener('beforeunload', onBeforeUnload)
      return function cleanup () {
        window.removeEventListener('beforeunload', onBeforeUnload)
      }
    }, [onBeforeUnload])

    const loadAttachment = ({ filepath, dispatch }) => {
      switch (path.extname(filepath)) {
        case '.obj':
          objLoader.load(
            filepath,
            event => {
              let value = { scene: event.detail.loaderRootNode }
              log.info('cache: success', filepath)
              dispatch({ type: 'ATTACHMENTS_SUCCESS', payload: { id: filepath, value } })
            },
            null,
            error => {
              log.error('cache: error')
              log.error(error)
              alert(error)
              // dispatch({ type: 'ATTACHMENTS_ERROR', payload: { id: filepath, error } })
              dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: filepath } })
            }
          )
          return dispatch({ type: 'ATTACHMENTS_LOAD', payload: { id: filepath } })

        case '.gltf':
        case '.glb':
          gltfLoader.load(
            filepath,
            value => {
              log.info('cache: success', filepath)
              dispatch({ type: 'ATTACHMENTS_SUCCESS', payload: { id: filepath, value } })
            },
            null,
            error => {
              log.error('cache: error')
              log.error(error)
              alert(error)
              // dispatch({ type: 'ATTACHMENTS_ERROR', payload: { id: filepath, error } })
              dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: filepath } })

            }
          )
          return dispatch({ type: 'ATTACHMENTS_LOAD', payload: { id: filepath } })
      }
    }

    // TODO cancellation (e.g.: redux-saga)
    const loadSceneObjects = async (dispatch, state) => {
      let storyboarderFilePath = state.meta.storyboarderFilePath

      const loadables = Object.values(sceneObjects)
        // has a value for model
        .filter(o => o.model != null)
        // loaded false or undefined or null
        .filter(o => o.loaded !== true)

      for (let loadable of loadables) {
        // don't try to load the box
        if (loadable.type === 'object' && loadable.model === 'box') {
          continue
        }

        let expectedFilepath = ModelLoader.getFilepathForModel(loadable, { storyboarderFilePath })

        // grab the latest state
        withState(async (dispatch, state) => {
          // if it's in the cache already, skip
          if (state.attachments[expectedFilepath]) return

          // prevent doubling up
          dispatch({ type: 'ATTACHMENTS_PENDING', payload: { id: expectedFilepath } })

          // if absolute filepath does not exist ...
          if (!fs.existsSync(expectedFilepath)) {
            // ... ask the artist to locate it
            try {

              const choice = dialog.showMessageBox({
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Model file not found',
                message: `Could not find model file at ${expectedFilepath}. Try to find it?`,
              })

              const shouldRelocate = (choice === 0)

              if (!shouldRelocate) {
                throw new Error('could not relocate missing file')
              }

              let updatedFilepath = await new Promise((resolve, reject) => {
                dialog.showOpenDialog(
                  {
                    title: 'Locate model file',
                    defaultPath: path.dirname(expectedFilepath),
                    filters: [
                      {
                        name: 'Model',
                        extensions: ['gltf', 'glb']
                      }
                    ]
                  },
                  filenames => {
                    if (filenames) {
                      resolve(filenames[0])
                    } else {
                      reject('no alternate filepath provided')
                    }
                  }
                )
              })

              // TODO test:
              // handle case where user relocated to a file in the models/* folder
              //
              //

              // // handle case where user relocated to a file in the models/* folder
              // if (
              //   // the absolute folder name of the model file ...
              //   path.resolve(path.normalize(path.dirname(updatedFilepath))) ===
              //   // ... is the same as the absolute folder name where we expect models of this type ...
              //   ModelLoader.projectFolder(updatedFilepath)
              // ) {
              //   // update the model path to relative path
              //   log.info(`setting model from absolute to relative model:${model} filepath:${updatedFilepath}`)
              //   let updatedModel = path.join('models', loadable.type, path.basename(updatedFilepath))
              //   dispatch(updateObject(loadable.id, { model: updatedModel }))
              //   return
              // }


              // update with absolute path to relocated model
              // dispatch(updateObject(loadable.id, { model: updatedFilepath }))


              // remove the pending absolute path from attachments
              dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: expectedFilepath } })
              // update ALL instances of the model with the new location
              dispatch({
                type: 'ATTACHMENTS_RELOCATE',
                payload: {
                  src: expectedFilepath,
                  dst: updatedFilepath
                }
              })
              return

            } catch (error) {
              log.error(error)

              // cancellation by user
              // dialog.showMessageBox({
              //   title: 'Failed to load',
              //   message: `Failed to load model ${model}`
              // })

              // dispatch({ type: 'ATTACHMENTS_ERROR', payload: { id: expectedFilepath, error: 'could not locate' } })
              dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: expectedFilepath } })
              return
            }
          }

          if (ModelLoader.needsCopy(loadable)) {
            let src = expectedFilepath

            let dst = path.join(
              path.dirname(storyboarderFilePath),
              ModelLoader.projectFolder(loadable.type),
              path.basename(expectedFilepath)
            )

            log.info('will copy from', src, 'to', dst)

            // make sure the path exists
            fs.ensureDirSync(path.dirname(dst))

            // as long as they are different files, we need to copy them
            if (src !== dst) {

              // prompt before overwrite
              // (commented out for now because it's annoying in practice)
              //
              // if (fs.existsSync(dst)) {
              //   let choice = dialog.showMessageBox(null, {
              //     type: 'question',
              //     buttons: ['Yes', 'No'],
              //     message: 'Model file already exists. Overwrite?'
              //   })
              //   if (choice !== 0) {
              //     log.info('cancelled model file copy')
              //     throw new Error('Skipped')
              //   }
              // }

              log.info(`copying model file from ${src} to ${dst}`)
              fs.copySync(src, dst, { overwrite: true, errorOnExist: false })
            }

            // update it in the data
            let updatedModel = path.join(
              ModelLoader.projectFolder(loadable.type),
              path.basename(dst)
            )

            dispatch(updateObject(loadable.id, { model: updatedModel }))

            // let id = ModelLoader.getFilepathForModel({ model: updatedModel, type: loadable.type }, { storyboarderFilePath })
            // dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id} })

            // remove the pending absolute path from attachments
            dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: src } })
            return
          }

          loadAttachment({ filepath: expectedFilepath, dispatch })
        })
      }
    }

    const loadWorldEnvironment = async (dispatch, state) => {
      let storyboarderFilePath = state.meta.storyboarderFilePath

      let expectedFilepath = ModelLoader.getFilepathForModel({
        model: world.environment.file,
        type: 'environment'
      }, { storyboarderFilePath })

        withState(async (dispatch, state) => {
          if (state.attachments[expectedFilepath]) return

          dispatch({ type: 'ATTACHMENTS_PENDING', payload: { id: expectedFilepath } })

          if (!fs.existsSync(expectedFilepath)) {
            try {

              const choice = dialog.showMessageBox({
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Model file not found',
                message: `Could not find model file at ${expectedFilepath}. Try to find it?`,
              })

              const shouldRelocate = (choice === 0)

              if (!shouldRelocate) {
                throw new Error('could not relocate missing file')
              }

              let updatedFilepath = await new Promise((resolve, reject) => {
                dialog.showOpenDialog(
                  {
                    title: 'Locate model file',
                    defaultPath: path.dirname(expectedFilepath),
                    filters: [
                      {
                        name: 'Model',
                        extensions: ['gltf', 'glb']
                      }
                    ]
                  },
                  filenames => {
                    if (filenames) {
                      resolve(filenames[0])
                    } else {
                      reject('no alternate filepath provided')
                    }
                  }
                )
              })

              log.info('user selected updatedFilepath:', updatedFilepath)

              // TODO test:
              // handle case where user relocated to a file in the models/* folder
              //

              // remove the pending absolute path from attachments
              dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: expectedFilepath } })
              // update the instance
              dispatch({
                type: 'UPDATE_WORLD_ENVIRONMENT',
                payload: {
                  file: updatedFilepath
                }
              })
              return

            } catch (error) {
              log.error(error)
              dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: expectedFilepath } })
              return
            }
          }

          let loadable = {
            model: world.environment.file,
            type: 'environment'
          }
          if (ModelLoader.needsCopy(loadable)) {
            let src = expectedFilepath

            let dst = path.join(
              path.dirname(storyboarderFilePath),
              ModelLoader.projectFolder(loadable.type),
              path.basename(expectedFilepath)
            )

            log.info('will copy from', src, 'to', dst)

            fs.ensureDirSync(path.dirname(dst))

            if (src !== dst) {
              log.info(`copying model file from ${src} to ${dst}`)
              fs.copySync(src, dst, { overwrite: true, errorOnExist: false })
            }

            let updatedModel = path.join(
              ModelLoader.projectFolder(loadable.type),
              path.basename(dst)
            )

            log.info('copied! updated model:', updatedModel)
            dispatch({
              type: 'UPDATE_WORLD_ENVIRONMENT',
              payload: {
                file: updatedModel
              }
            })
            dispatch({ type: 'ATTACHMENTS_DELETE', payload: { id: src } })
            return
          }

          loadAttachment({ filepath: expectedFilepath, dispatch })
        })
      }

    // HACK
    // always pre-load the adult-male model
    // because we use it for PosePresetsEditor thumbnail generation
    useEffect(() => {
      withState(dispatch => {
        let filepath = ModelLoader.getFilepathForModel(
          { model: 'adult-male', type: 'character' },
          { storyboarderFilePath: null }
        )
        loadAttachment({ filepath, dispatch })
      })
    }, [])

    useEffect(() => {
      withState(loadSceneObjects)
    }, [sceneObjects])

    useEffect(() => {
      if (world.environment.file) {
        withState(loadWorldEnvironment)
      }
    }, [world.environment.file])

    const notificationsRef = useRef()
    useEffect(() => {
      notifications.init(notificationsRef.current, true)
    }, [notificationsRef.current])

    return React.createElement(
      SceneContext.Provider,
      { value: { scene: scene.current }},
      h(
        ['div.column', { style: { width: '100%', height: '100%' } }, [
          [Toolbar, {
            createObject,
            selectObject,
            loadScene,
            saveScene,
            camera,
            setActiveCamera,
            resetScene,
            saveToBoard: onToolbarSaveToBoard,
            insertAsNewBoard: onToolbarInsertAsNewBoard,
            xrServerUrl,
            undoGroupStart,
            undoGroupEnd
          }],

          ['div.row', { style: { flex: 1, height: '100%' }},
            ['div.column', { style: { width: '300px', height: '100%', background: '#111'} },
              ['div#topdown', { style: { height: '300px' } },
                // top-down-canvas
                ['canvas', { key: 'top-down-canvas', tabIndex: 0, ref: smallCanvasRef, id: 'top-down-canvas', style: { width: '100%' }, onPointerDown: onCanvasPointerDown }],
                // controls
                ['div.topdown__controls', [
                  ['div.row', [
                    // ['a[href=#]', { onClick: onAutoFitClick }, [[Icon, { src: 'icon-camera-view-autofit' }]]],
                    // ['a[href=#]', { onClick: onZoomInClick }, [[Icon, { src: 'icon-camera-view-zoom-in' }]]],
                    // ['a[href=#]', { onClick: onZoomOutClick }, [[Icon, { src: 'icon-camera-view-zoom-out' }]]],
                  ]],
                  ['div.row', [
                    ['a[href=#]', { onClick: onSwapCameraViewsClick }, [[Icon, { src: 'icon-camera-view-expand' }]]],
                  ]]
                ]]
              ],
              ['div#elements', [ElementsPanel, { machineState, transition }]]
            ],

            ['div.column.fill',
              ['div#camera-view', { ref: mainViewContainerRef, style: { paddingTop: `${(1 / aspectRatio) * 100}%` } },
                // camera canvas
                ['canvas', { key: 'camera-canvas', tabIndex: 1, ref: largeCanvasRef, id: 'camera-canvas', onPointerDown: onCanvasPointerDown }],
                largeCanvasSize.width && [GuidesView, {
                  dimensions: {
                    width: Math.ceil(largeCanvasSize.width),
                    height: Math.ceil(largeCanvasSize.width / aspectRatio)
                  }
                }]
              ],
              ['div.inspectors', [
                [CameraInspector, { camera }],
                [BoardInspector],
                [GuidesInspector],
                [CamerasInspector]
              ]]
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

            ready && (remoteInput.mouseMode || remoteInput.orbitMode) && [PhoneCursor, { remoteInput, camera, largeCanvasRef, selectObject, selectBone, sceneObjects, selections, selectedBone }],
          ],

          // [LoadingStatus, { ready }]
        ],

        ready && [
          SceneManager, {
            mainViewCamera,
            largeCanvasRef,
            smallCanvasRef,
            machineState,
            transition,
            largeCanvasSize,
            attachments
          }
        ],

        !machineState.matches('typing') && [KeyHandler],

        [MenuManager],

        ['div.notifications', { ref: notificationsRef }]
      ]
    )
  )
})

module.exports = Editor