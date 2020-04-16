const THREE = require('three')
window.THREE = THREE

const React = require('react')
const {
  createStore,
  applyMiddleware
} = require('redux')
const ReactDOM = require('react-dom')

const {
  Provider,
  connect
} = require('react-redux')

const thunkMiddleware = require('redux-thunk').default

const h = require('../../utils/h')
const {
  reducer,
  initialState,
  getSerializedState,
  setBoard,
  loadScene
} = require('../../shared/reducers/shot-generator')

const RemoteDevice = require('./../../shared/network/client')
const SGConnection = RemoteDevice.connect()

const configureStore = preloadedState => {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware, SGConnection.ClientMiddleware))
  window.$r = {
    store
  }
  return store
}

const SceneManagerXR = require('./SceneManagerXR')

const setupXR = async () => {
  const store = configureStore({...initialState})
  SGConnection.connectStore(store)

  ReactDOM.render(
    <Provider store={store}>
      <SceneManagerXR SGConnection={SGConnection}/>
    </Provider>,
    document.getElementById('main')
  )
}

setupXR({
  stateJsonUri: '/state.json'
})
