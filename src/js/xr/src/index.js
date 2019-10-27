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

const configureStore = preloadedState => {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware))
  window.$r = {
    store
  }
  return store
}

const XRClient = require('./client')

const SceneManagerXR = require('./SceneManagerXR')

const setupXR = async ({
  stateJsonUri = '/state.json'
}) => {
  const client = XRClient()

  // get the shot generator window state
  let {
    aspectRatio
  } = await client.getSg()
  // get pose preset data
  let poses = await (await fetch('/presets/poses.json')).json()
  // get the shot generator shot state
  const {
    // serialized state
    state: {
      activeCamera,
      sceneObjects,
      world
    },
    // uid, shot, action, dialogue, notes
    board
  } = await client.getState()

  const store = configureStore({
    ...initialState,
    aspectRatio,
    models: initialState.models,
    presets: {
      poses: {
        ...initialState.presets.poses,
        ...poses
      },
      characters: {},
      scenes: {}
    }
  })

  store.dispatch({
    type: 'SET_ASPECT_RATIO',
    payload: aspectRatio
  })
  store.dispatch(setBoard(board))
  store.dispatch(loadScene({
    sceneObjects,
    world,
    activeCamera
  }))

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
          await client.sendState(uid, serializedState, stateJsonUri)
        } catch (err) {
          // TODO if error is that board has changed in SG, notify user, and reload in VR
          console.error(err)
        }
      })
    }, 5000)
  }

  ReactDOM.render(
    <Provider store={store}>
      <SceneManagerXR />
    </Provider>,
    document.getElementById('main')
  )
}

setupXR({
  stateJsonUri: '/state.json'
})