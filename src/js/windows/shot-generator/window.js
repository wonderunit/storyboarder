const { ipcRenderer, shell } = electron = require('electron')
const { app } = electron.remote
const electronUtil = require('electron-util')

const path = require('path')

const React = require('react')
const { useState, useEffect } = React
const { Provider, connect } = require('react-redux')
const ReactDOM = require('react-dom')
const { ActionCreators } = require('redux-undo')
//console.clear() // clear the annoying dev tools warning
const log = require('electron-log')
log.catchErrors()

const observable = require("../../utils/observable").default
const {loadAsset, cleanUpCache} = require("../../shot-generator/hooks/use-assets-manager")
const ModelLoader = require("./../../services/model-loader")
const {getFilePathForImages} = require("./../../shot-generator/helpers/get-filepath-for-images")

//
// configureStore:
const { createStore, applyMiddleware, compose } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const undoable = require('redux-undo').default
const { reducer } = require('../../shared/reducers/shot-generator')
const loadBoardFromData = require('../../shared/actions/load-board-from-data')

const {SGMiddleware} = require('./../../xr/sockets')

const actionSanitizer = action => (
  action.type === 'ATTACHMENTS_SUCCESS' && action.payload ?
  { ...action, payload: { ...action.payload, value: '<<DATA>>' } } : action
)
const stateSanitizer = state => state.attachments ? { ...state, attachments: '<<ATTACHMENTS>>' } : state
const reduxDevtoolsExtensionOptions = {
  actionSanitizer,
  stateSanitizer,
  trace: true,
}
const composeEnhancers = (
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__(reduxDevtoolsExtensionOptions)
  ) || compose
const configureStore = function configureStore (preloadedState) {
  const store = createStore(
    reducer,
    preloadedState,
    composeEnhancers(
      applyMiddleware(thunkMiddleware, SGMiddleware)
    )
  )
  return store
}

const Editor = require('../../shot-generator/components/Editor').default

const presetsStorage = require('../../shared/store/presetsStorage')
const { initialState, setBoard } = require('../../shared/reducers/shot-generator')

const XRServer = require('../../xr/server')
const service = require('./service')

let xrServer


window.addEventListener('load', () => {
  ipcRenderer.send('shot-generator:window:loaded')
})

// TODO better error handling for user
// window.onerror = (message, source, lineno, colno, error) => {
//   alert(`An error occurred\n\n${message}\n\nin ${source}:${lineno}`)
// }

const poses = require('../../shared/reducers/shot-generator-presets/poses.json')

const store = configureStore({
  ...initialState,
  presets: {
    ...initialState.presets,
    scenes: {
      ...initialState.presets.scenes,
      ...presetsStorage.loadScenePresets().scenes
    },
    characters: {
      ...initialState.presets.characters,
      ...presetsStorage.loadCharacterPresets().characters
    },
    poses: {
      ...initialState.presets.poses,
      ...poses,
      ...presetsStorage.loadPosePresets().poses
    },
    handPoses: {
      ...initialState.presets.handPoses,
      ...presetsStorage.loadHandPosePresets().handPoses
    }
  },
})
const preloadData = async () => {
  const { storyboarderFilePath } = await service.getStoryboarderFileData()

/*   await loadAsset(ModelLoader.getFilepathForModel({
    model: 'adult-male-lod',
    type: 'character'
  }, { storyboarderFilePath })) */

  await loadAsset(ModelLoader.getFilepathForModel({
    model: 'adult-male',
    type: 'character'
  }, { storyboarderFilePath }))
  await loadAsset( path.join(window.__dirname, 'data', 'shot-generator', 'dummies', 'bone.glb'))
  await loadAsset( path.join(window.__dirname, 'data', 'shot-generator', 'xr', 'light.glb'))
  await loadAsset( path.join(window.__dirname, 'data', 'shot-generator', 'xr', 'hmd.glb'))
}

const loadBoard = async (board) => {
  loadBoardFromData(board, store.dispatch)
  
  if (!board.sg) {
    return false
  }

  const { storyboarderFilePath } = await service.getStoryboarderFileData()
  const {sceneObjects, world} = board.sg.data

  await Object.values(sceneObjects)
  // has a value for model
  .filter(o => o.model != null)
  // is not a box
  .filter(o => !(o.type === 'object' && o.model === 'box'))
  // what's the filepath?
  .map((object) => ModelLoader.getFilepathForModel(object, { storyboarderFilePath }))
  // request the file
  .map(loadAsset)

  if (world.environment.file) {
    await loadAsset(
      ModelLoader.getFilepathForModel({
        model: world.environment.file,
        type: 'environment'
      }, { storyboarderFilePath })
    )
  }

  const paths = Object.values(sceneObjects)
  .filter(o => o.volumeImageAttachmentIds && o.volumeImageAttachmentIds.length > 0)
  .map((object) => getFilePathForImages(object, storyboarderFilePath))

  for(let i = 0; i < paths.length; i++) {
    if(!Array.isArray(paths[i])) {
      await loadAsset(paths[i])
    } else {
      for(let j = 0; j < paths[i].length; j++) {
        await loadAsset(paths[i][j])
      }
    }
  }
}

// load via Storyboarder request
ipcRenderer.on('shot-generator:reload', async (event) => {
  const { storyboarderFilePath, boardData } = await service.getStoryboarderFileData()
  const { board } = await service.getStoryboarderState()

  let aspectRatio = parseFloat(boardData.aspectRatio)

  store.dispatch({
    type: 'SET_META_STORYBOARDER_FILE_PATH',
    payload: storyboarderFilePath
  })
  store.dispatch({
    type: 'SET_ASPECT_RATIO',
    payload: aspectRatio
  })

  await loadBoard(board)

  if (!xrServer) {
    xrServer = new XRServer({ store, service })
  }

  await preloadData()
})
ipcRenderer.on('update', (event, { board }) => {
  store.dispatch(setBoard(board))
})

// load via server request (e.g.: triggered by VR)
ipcRenderer.on('loadBoardByUid', async (event, uid) => {
  cleanUpCache()
  await preloadData()

  let board = await service.getBoard(uid)
  await loadBoard(board)
})

ipcRenderer.on('shot-generator:edit:undo', () => {
  store.dispatch( ActionCreators.undo() )
})
ipcRenderer.on('shot-generator:edit:redo', () => {
  store.dispatch( ActionCreators.redo() )
})


window.$r = { store }

// disabled for now so we can reload the window easily during development
// ipcRenderer.once('ready', () => {})

log.info('ready!')
electronUtil.disableZoom()

ReactDOM.render(
  <Provider store={store}>
    <Editor store={store}/>
  </Provider>,
  document.getElementById('main')
)
