const { ipcRenderer, shell } = electron = require('electron')
const remote = require('@electron/remote')

// const https = require('https')
// https.globalAgent.options.rejectUnauthorized = false;
// const nodeFetch = require('node-fetch').default
// const WS = require('ws')

const path = require('path')
const shotExplorer = require('../shot-explorer/setup')
const { Suspense } = React = require('react')
const { Provider, connect } = require('react-redux')
const ReactDOM = require('react-dom')
const { ActionCreators } = require('redux-undo')
//console.clear() // clear the annoying dev tools warning
const log = require('../../shared/storyboarder-electron-log')
log.catchErrors()

const observable = require("../../utils/observable").default
const {loadAsset, cleanUpCache} = require("../../shot-generator/hooks/use-assets-manager")
const ModelLoader = require("./../../services/model-loader")
const {getFilePathForImages} = require("./../../shot-generator/helpers/get-filepath-for-images")

// Configure Super antiCORS fetch and WebSocket
/*
const agent = new https.Agent({
  rejectUnauthorized: false
})
window.fetch = (url, options = {}) => {
  return nodeFetch(url, {...options, agent})
}

window.WebSocket = class extends WS {
  constructor(link) {
    super(link, {rejectUnauthorized: false})
  }
}
*/

//
// configureStore:
const { createStore, applyMiddleware, compose } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const undoable = require('redux-undo').default
const { reducer } = require('../../shared/reducers/shot-generator')
const loadBoardFromData = require('../../shared/actions/load-board-from-data')
let sendedAction = null

const { I18nextProvider } = require('react-i18next')
const i18n = require('../../services/i18next.config')
const {SGMiddleware} = require('./../../services/server/sockets')

require("../../shared/helpers/monkeyPatchGrayscale")

const shotExplorerMiddleware = store => next => action => {
  if(!action) return
  if(sendedAction !== action) {
    let win = shotExplorer.getWindow()
    if (win && !win.isDestroyed() && !action.type.includes("UNDO")) {
      let json
      if(action.payload && action.payload.skeleton) {
        json = JSON.stringify(action)
      } else {
        json = action
      }
      win.webContents.send('shot-explorer:updateStore', json)
    }
  }
  return next(action)
  
}

const middlewares = [ thunkMiddleware, shotExplorerMiddleware, SGMiddleware]

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
      applyMiddleware(...middlewares),
    ),
  
    )
    return store
}


const Editor = require('../../shot-generator/components/Editor').default

const presetsStorage = require('../../shared/store/presetsStorage')
const { initialState, setBoard } = require('../../shared/reducers/shot-generator')

const {initServer} = require('../../services/server')
const service = require('./service')

let showShotExplorerOnRead = false


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
    },
    emotions: {
      ...initialState.presets.emotions,
      ...presetsStorage.loadEmotionsPresets().emotions
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

  shotExplorer.createWindow(() => {
    shotExplorer.getWindow().webContents.send('shot-generator:open:shot-explorer')
    if(showShotExplorerOnRead){
      shotExplorer.reveal()
      shotExplorer.getWindow().webContents.send('shot-explorer:show')
    }
  }, aspectRatio)

  await loadBoard(board)

  initServer({ store, service })

  await preloadData()
})
ipcRenderer.on('update', (event, { board }) => {111
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

ipcRenderer.on('shot-generator:show:shot-explorer', () => {

  if(!shotExplorer.isLoaded()) {
    showShotExplorerOnRead = true
    return
  }
  shotExplorer.reveal()
  shotExplorer.getWindow().webContents.send('shot-explorer:show')
})

remote.getCurrentWindow().on("close", () => {
  let shotExplorerWindow = shotExplorer.getWindow()
  if(shotExplorerWindow)
    shotExplorerWindow.destroy()
})

ipcRenderer.on('shot-generator:get-storyboarder-file-data', (event, data) => {
  let win = shotExplorer.getWindow()
  if (win) {
    win.send('shot-generator:get-storyboarder-file-data', data)
  }
})


ipcRenderer.on('shot-generator:get-board', (event, board) => {
  let win = shotExplorer.getWindow()
  if (win) {
    win.send('shot-generator:get-board', board)
  }
})

ipcRenderer.on('shot-generator:get-state', (event, data) => {
  let win = shotExplorer.getWindow()
  if (win) {
    win.send('shot-generator:get-state', data)
  }
})

ipcRenderer.on('shot-generator:updateStore', (event, action) => {
  sendedAction = action
  store.dispatch(action)
})

ipcRenderer.on('shot-explorer:show', (event) => {
  let win = shotExplorer.getWindow()
  if (win) {
    win.send('shot-explorer:show')
  }
})

//#region Localization 
i18n.on('loaded', (loaded) => {
  let lng = ipcRenderer.sendSync("getCurrentLanguage")
  i18n.changeLanguage(lng, () => {
    i18n.on("languageChanged", changeLanguage)
  })
  i18n.off('loaded')
})

const updateLanguageInStore = (lng) => {
  store.dispatch({
    type: "SET_CURRENT_LANGUAGE",
    payload: lng
  })
}
const changeLanguage = (lng) => {
  updateLanguageInStore(lng)
  ipcRenderer.send("languageChanged", lng)
}


ipcRenderer.on("languageChanged", (event, lng) => {
  i18n.off("languageChanged", changeLanguage)
  i18n.changeLanguage(lng, () => {
    i18n.on("languageChanged", changeLanguage)
  })
  shotExplorer.getWindow().webContents.send('shot-explorer:change-language', lng)
})

ipcRenderer.on("languageModified", (event, lng) => {
  i18n.reloadResources(lng).then(() => i18n.changeLanguage(lng))
  shotExplorer.getWindow().webContents.send('shot-explorer:language-modified', lng)
})
//#endregion


window.$r = { store }

// disabled for now so we can reload the window easily during development
// ipcRenderer.once('ready', () => {})

log.info('ready!')

ReactDOM.render(
    <Provider store={ store }>
      <I18nextProvider i18n={ i18n }>
        <Suspense fallback="loading">
          <Editor store={store}/>
        </Suspense>
      </I18nextProvider>
    </Provider>,
  document.getElementById('main')
)
