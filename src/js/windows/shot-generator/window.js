const { ipcRenderer, shell } = require('electron')
const { app } = require('electron').remote
const electronUtil = require('electron-util')

const React = require('react')
const { useRef } = React
const { Provider, connect } = require('react-redux')
const ReactDOM = require('react-dom')
console.clear() // clear the annoying dev tools warning



// TODO use the main Storyboarder store instead of a special one for Shot Generator
//
// configureStore:
const { createStore, applyMiddleware } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const { reducer } = require('../../shared/reducers/shot-generator')
const configureStore = function configureStore (preloadedState) {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware))
  return store
}



const h = require('../../utils/h')
const Editor = require('../../shot-generator/Editor')

const presetsStorage = require('../../shared/store/presetsStorage')
const { initialState, loadScene, resetScene } = require('../../shared/reducers/shot-generator')

const createServer = require('../../services/createServer')

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



ipcRenderer.on('setup', (event, { aspectRatio }) => {
  store.dispatch({
    type: 'SET_ASPECT_RATIO',
    payload: aspectRatio
  })
})
ipcRenderer.on('loadShot', (event, shot) => {
  if (shot) {
    store.dispatch(loadScene(shot.data))
  } else {
    store.dispatch(resetScene())
  }
})



window.$r = { store }

// disabled for now so we can reload the window easily during development
// ipcRenderer.once('ready', () => {})

console.log('ready!')
electronUtil.disableZoom()

ReactDOM.render(
  h([
    Provider, { store }, [
      Editor
    ]
  ]),
  document.getElementById('main')
)

// const throttle = require('lodash.throttle')
// const updater = (values, changed) => {
//   store.dispatch({ type: 'UPDATE_DEVICE', payload: {
//     id: 0,
//     motion: {
//       ...values.motion
//     },
//     digital: {
//       ...values.digital
//     }
//   }})
// }
// createDualShockController(throttle(updater, 16, { leading: true }))

createServer({
  setInputAccel: payload => store.dispatch({ type: 'SET_INPUT_ACCEL', payload }),
  setInputMag: payload => store.dispatch({ type: 'SET_INPUT_MAG', payload }),
  setInputSensor: payload => store.dispatch({ type: 'SET_INPUT_SENSOR', payload }),
  setInputDown: payload => store.dispatch({ type: 'SET_INPUT_DOWN', payload }),
  setInputMouseMode: payload => store.dispatch({ type: 'SET_INPUT_MOUSEMODE', payload })
})
