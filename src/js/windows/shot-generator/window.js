const { ipcRenderer, shell } = electron = require('electron')
const { app } = electron.remote
const electronUtil = require('electron-util')

const React = require('react')
const { useRef } = React
const { Provider, connect } = require('react-redux')
const ReactDOM = require('react-dom')
const { ActionCreators } = require('redux-undo')
console.clear() // clear the annoying dev tools warning
const log = require('electron-log')
log.catchErrors()



//
// configureStore:
const { createStore, applyMiddleware, compose } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const undoable = require('redux-undo').default
const { reducer } = require('../../shared/reducers/shot-generator')

const actionSanitizer = action => (
  action.type === 'ATTACHMENTS_SUCCESS' && action.payload ?
  { ...action, payload: { ...action.payload, value: '<<DATA>>' } } : action
)
const stateSanitizer = state => state.attachments ? { ...state, attachments: '<<ATTACHMENTS>>' } : state
const reduxDevtoolsExtensionOptions = {
  actionSanitizer,
  stateSanitizer
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
      applyMiddleware(thunkMiddleware)
    )
  )
  return store
}



const h = require('../../utils/h')
const Editor = require('../../shot-generator/Editor')

const presetsStorage = require('../../shared/store/presetsStorage')
const { initialState, loadScene, resetScene, updateDevice, /*updateServer,*/ setBoard } = require('../../shared/reducers/shot-generator')

// const createServer = require('../../services/createServer')
const createDualShockController = require('../../shot-generator/DualshockController')

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
      ...presetsStorage.loadPosePresets().poses
    }
  },
})

ipcRenderer.on('shot-generator:reload', async (event) => {
  const { storyboarderFilePath, boardData } = await service.getStoryboarderFileData()
  const { board } = await service.getStoryboarderState()

  console.log('reload says', board)

  let shot = board.sg
  let aspectRatio = parseFloat(boardData.aspectRatio)

  store.dispatch({
    type: 'SET_META_STORYBOARDER_FILE_PATH',
    payload: storyboarderFilePath
  })
  store.dispatch({
    type: 'SET_ASPECT_RATIO',
    payload: aspectRatio
  })
  store.dispatch(
    setBoard(board)
  )

  if (shot) {
    store.dispatch(loadScene(shot.data))
  } else {
    store.dispatch(resetScene())
  }
  store.dispatch(ActionCreators.clearHistory())

  if (!xrServer) {
    xrServer = new XRServer({ store, service })
  }
})

ipcRenderer.on('update', (event, { board }) => {
  store.dispatch(setBoard( board ))
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
  h([
    Provider, { store }, [
      Editor
    ]
  ]),
  document.getElementById('main')
)

const throttle = require('lodash.throttle')
const updater = (values, changed) => {
  store.dispatch(updateDevice(
    0,
    {
      analog: {
        ...values.analog
      },
      motion: {
        ...values.motion
      },
      digital: {
        ...values.digital
      }
    }
  ))
}
createDualShockController(throttle(updater, 16, { leading: true }))

// createServer({
//   setInputAccel: payload => store.dispatch({ type: 'SET_INPUT_ACCEL', payload }),
//   setInputMag: payload => store.dispatch({ type: 'SET_INPUT_MAG', payload }),
//   setInputSensor: payload => store.dispatch({ type: 'SET_INPUT_SENSOR', payload }),
//   setInputDown: payload => store.dispatch({ type: 'SET_INPUT_DOWN', payload }),
//   setInputMouseMode: payload => store.dispatch({ type: 'SET_INPUT_MOUSEMODE', payload }),
//   setInputOrbitMode: payload => store.dispatch({ type: 'SET_INPUT_ORBITMODE', payload }),
//
//   updateServer: payload => store.dispatch(updateServer(payload))
// })
