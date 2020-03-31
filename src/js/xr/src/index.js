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

const setupXR = async ({
  stateJsonUri = '/state.json'
}) => {
  const store = configureStore({...initialState})
  SGConnection.connectStore(store)
  
  // TODO don't send to server if data change was just a new board loaded from the server
  //      (avoid re-sending what SG already knows about)
  if (!process.env.XR_STANDALONE_DEMO) {
    // after 5s, start POST'ing changes back
    setTimeout(() => {
      store.subscribe(async () => {
        let state = store.getState(stateJsonUri)
        let uid = state.board.uid
        let serializedState = getSerializedState(state)
        try {
          console.log('Send state')
          //await client.sendState(uid, serializedState, stateJsonUri)
        } catch (err) {
          // TODO if error is that board has changed in SG, notify user, and reload in VR
          console.error(err)
        }
      })
    }, 5000)
  }

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
