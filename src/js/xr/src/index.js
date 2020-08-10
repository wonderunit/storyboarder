const THREE = require('three')
window.THREE = THREE

const React = require('react')
const {
  createStore,
  applyMiddleware
} = require('redux')

const ReactDOM = require('react-dom')

const {Provider} = require('react-redux')

const thunkMiddleware = require('redux-thunk').default

const {
  reducer,
  initialState
} = require('../../shared/reducers/shot-generator')

const RemoteDevice = require('./../../shared/network/client')
const SceneManagerXR = require('./SceneManagerXR')

const SGConnection = RemoteDevice.connect()

const configureStore = preloadedState => {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware, SGConnection.ClientMiddleware))
  window.$r = {
    store
  }
  return store
}

const store = configureStore({...initialState})
SGConnection.connectStore(store)

window.addEventListener("error", function (e) {
  SGConnection.log([e.error.message, e.error.stack])
  return false;
})

window.SG = SGConnection

ReactDOM.render(
  <Provider store={store}>
    <SceneManagerXR SGConnection={SGConnection}/>
  </Provider>,
  document.getElementById('main')
)