const THREE = require('three')
window.THREE = THREE

const React = require('react')
const { createStore, applyMiddleware } = require('redux')
const ReactDOM = require('react-dom')

const { Provider, connect } = require('react-redux')

const thunkMiddleware = require('redux-thunk').default

const h = require('../../utils/h')
const { reducer, initialState, getSerializedState } = require('../../shared/reducers/shot-generator')

const configureStore = preloadedState => {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware))
  window.$r = { store }
  return store
}

const SceneManagerXR = require('./SceneManagerXR')

const sendStateToServer = async ({ state }) => {
  await fetch(
    '/state.json',
    {
      method: 'POST',
      body: JSON.stringify(state),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  )
}

const init = async () => {
  // get the shot generator window state
  let { aspectRatio } = await(await fetch('/sg.json')).json()
  // get pose preset data
  let poses = await(await fetch('/presets/poses.json')).json()
  // get the shot generator shot state
  const { activeCamera, sceneObjects, world } = await (await fetch('/state.json')).json()

  const store = configureStore({
    aspectRatio,
    undoable: {
      ...initialState.undoable,
      sceneObjects,
      world,
      activeCamera
    },
    models: initialState.models,
    presets: {
      poses,
      characters: {},
      scenes: {}
    }
  })

  if (!process.env.XR_STANDALONE_DEMO) {
    // after 5s, start POST'ing changes back
    setTimeout(() => {
      store.subscribe(async () => {
        let state = getSerializedState(store.getState())
        await sendStateToServer({ state })
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

init()
