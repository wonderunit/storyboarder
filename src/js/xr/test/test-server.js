// npx electron src/js/xr/test/test-server.js



// point to 'Storyboarder' instead of 'Electron'
// to fix getPath('userData') calls
// so that poses.json will load correctly
const path = require('path')
const electron = require('electron')
const app = electron.app ? electron.app : electron.remote.app
app.setName('Storyboarder')
app._setDefaultAppPaths(path.join(__dirname, '..', '..', '..', '..', 'package.json'))



const XRServer = require('../server')
const XRServerOld = require('../../express-xr/app')

const { ActionCreators } = require('redux-undo')

const { createStore, applyMiddleware, compose } = require('redux')
const thunkMiddleware = require('redux-thunk').default

const { reducer, initialState, loadScene, resetScene, updateDevice, updateServer, setBoard } = require('../../shared/reducers/shot-generator')

const actionSanitizer = action => (
  action.type === 'ATTACHMENTS_SUCCESS' && action.payload ?
  { ...action, payload: { ...action.payload, value: '<<DATA>>' } } : action
)
const stateSanitizer = state => state.attachments ? { ...state, attachments: '<<ATTACHMENTS>>' } : state
const reduxDevtoolsExtensionOptions = {
  actionSanitizer,
  stateSanitizer
}
// const composeEnhancers = (
//     window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ &&
//     window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__(reduxDevtoolsExtensionOptions)
//   ) || compose
const composeEnhancers = compose
const configureStore = function configureStore (preloadedState) {
  const store = createStore(
    reducer,
    preloadedState,
    composeEnhancers(
      applyMiddleware(thunkMiddleware)
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
      // ...presetsStorage.loadScenePresets().scenes
    },
    characters: {
      ...initialState.presets.characters,
      // ...presetsStorage.loadCharacterPresets().characters
    },
    poses: {
      ...initialState.presets.poses,
      // ...presetsStorage.loadPosePresets().poses
    }
  },
})

let xrServer

const fs = require('fs')
// const path = require('path')

// via https://github.com/electron/electron/issues/4690#issuecomment-217435222
const argv = process.defaultApp ? process.argv.slice(2) : process.argv

const storyboarderFilePath =
  // use filename, if passed
  argv[0] ||
  // or, default
  path.join(__dirname, '..', '..', '..', '..', 'test', 'fixtures', 'xr', 'xr.storyboarder')

console.log('Loading', storyboarderFilePath, '\n')

let boardData = JSON.parse(fs.readFileSync(storyboarderFilePath))
let board = boardData.boards[0]
let shot = board.sg

store.dispatch({ type: 'SET_META_STORYBOARDER_FILE_PATH', payload: storyboarderFilePath })

let aspectRatio = parseFloat(boardData.aspectRatio)
store.dispatch({ type: 'SET_ASPECT_RATIO', payload: aspectRatio })

store.dispatch(setBoard( board ))

store.dispatch(loadScene(shot.data))
store.dispatch(ActionCreators.clearHistory())

xrServer = new XRServer({ store })
xrServerOld = new XRServerOld({ store })
