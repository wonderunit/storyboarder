// node ./src/js/express-xr/test/test-server.js

const XRServer = require('../app')

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
const path = require('path')

let storyboarderFilePath = path.join(
  __dirname, '..', '..', '..', '..', 'test', 'fixtures', 'shot-generator', 'shot-generator.storyboarder'
)

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
