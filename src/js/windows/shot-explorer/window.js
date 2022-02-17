const ReactDOM = require('react-dom')
const React = require('react')
const { ipcRenderer, shell } = electron = require('electron')
const { Provider, batch } = require('react-redux')
const remote = require('@electron/remote')
const THREE = require('three')
const { createStore, applyMiddleware, compose } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const { reducer } = require('../../shared/reducers/shot-generator')
const presetsStorage = require('../../shared/store/presetsStorage')
const { initialState } = require('../../shared/reducers/shot-generator')
const poses = require('../../shared/reducers/shot-generator-presets/poses.json')
const ShotExplorer = require('../../shot-explorer').default
const service = require('../shot-generator/service')
const {loadAsset, cleanUpCache} = require("../../shot-generator/hooks/use-assets-manager")
const ModelLoader = require("./../../services/model-loader")
const {getFilePathForImages} = require("./../../shot-generator/helpers/get-filepath-for-images")
const {
  setBoard,
  loadScene,
  resetScene,
} = require('../../shared/reducers/shot-generator')
const i18n = require('../../services/i18next.config')

require("../../shared/helpers/monkeyPatchGrayscale")
let sendedAction = []
let isBoardShown = false
let isBoardLoaded = false
let componentKey = THREE.Math.generateUUID()
let shotExplorerElement 
let isVisible = remote.getCurrentWindow().visible
let defaultHeight = 800
let canvasHeight = 400
let minimumWidth = 300

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
        applyMiddleware(
            thunkMiddleware, store => next => action => {
              let indexOf = sendedAction.indexOf(action)
              if(action && indexOf === -1) {
                ipcRenderer.send("shot-generator:updateStore", action)
              }
              return next(action)
            })
      )
    )
    return store
}

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

const showShotExplorer = () => {
  if(!isBoardLoaded) {
    setTimeout( () => {
      showShotExplorer()
    }, 100)
    return
  }
  isVisible = true;
  pushUpdates();
  isBoardShown = true;
}

ipcRenderer.on('shot-explorer:show', (event) => {
  showShotExplorer()
})

ipcRenderer.on("shot-generator:open:shot-explorer", async (event) => {
  const { storyboarderFilePath, boardData } = await service.getStoryboarderFileData()
  const { board } = await service.getStoryboarderState()
  let aspectRatio = parseFloat(boardData.aspectRatio)

  canvasHeight = defaultHeight * 0.45
  let scaledWidth = Math.ceil(canvasHeight * aspectRatio)
  scaledWidth = minimumWidth > scaledWidth ? minimumWidth : scaledWidth
  let win = remote.getCurrentWindow()
  win.setSize(scaledWidth, defaultHeight)
  win.setMinimumSize(scaledWidth, defaultHeight)
  win.setMaximumSize(scaledWidth, 100000)
  win.center()
  let action  = {
    type: 'SET_META_STORYBOARDER_FILE_PATH',
    payload: storyboarderFilePath
  }
  sendedAction.push(action)
  store.dispatch(action)
  action = {
    type: 'SET_ASPECT_RATIO',
    payload: aspectRatio
  }
  sendedAction.push(action)
  store.dispatch(action)

  await loadBoard(board, storyboarderFilePath)
  isBoardLoaded = true
})

ipcRenderer.on("shot-explorer:updateStore", (event, action) => {
  sendedAction.push(action)
})

ipcRenderer.on("shot-explorer:change-language", (event, lng) => {
  i18n.changeLanguage(lng)
})

ipcRenderer.on("shot-explorer:language-modified", (event, lng) => {
  i18n.reloadResources(lng).then(() => i18n.changeLanguage(lng))
})

remote.getCurrentWindow().webContents.on('will-prevent-unload', event => {
  isBoardShown = false
})

remote.getCurrentWindow().on("hide", () => {
  isVisible = false
})

const pushUpdates = () => {
  shotExplorerElement = renderShotExplorer()
  batch(() => {
    for(let i = 0, length = sendedAction.length; i < length; i++) {
      let object = sendedAction[i]
      let action = object
      if(!action.type) {
        action = JSON.parse(object)
        sendedAction.push(action)
      }
      store.dispatch(action)
    }
  })
  sendedAction = []
  renderDom()
}

remote.getCurrentWindow().on("focus", () => {
  if(!sendedAction.length || !isBoardShown || !isBoardLoaded) return
  pushUpdates()
})

const loadBoard = async (board, storyboarderFilePath) => {
  let shot = board.sg
  let action = setBoard(board)
  sendedAction.push(action)
  store.dispatch(action)
  
  if (shot) {
    action = loadScene(shot.data)
    sendedAction.push(action)
    store.dispatch(action)
  } else {
    action = resetScene()
    sendedAction.push(action)
    store.dispatch(action)
  }
  
  
  if (!board.sg) {
    return false
  }

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

const renderShotExplorer = () => {
  componentKey = THREE.Math.generateUUID()
  return <ShotExplorer 
                elementKey={ componentKey } 
                store={ store }
                canvasHeight={ canvasHeight }/>
}
shotExplorerElement = renderShotExplorer()

const renderDom = () => {
  ReactDOM.render(
    (store && <Provider store={ store }>
     { shotExplorerElement }
    </Provider> ),
  document.getElementById('main')
    )
}
renderDom()

