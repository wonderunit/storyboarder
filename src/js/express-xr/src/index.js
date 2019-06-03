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

fetch('/state.json')
  .then(response => response.json())
  .then(result => {
    const { aspectRatio, activeCamera, sceneObjects, world } = result
    const store = configureStore({
      aspectRatio,
      undoable: {
        sceneObjects,
        world,
        activeCamera
      },
      models: initialState.models,
      presets: {
        poses: {}
      }
    })

    store.subscribe(() => {
      let state = {
        ...getSerializedState(store.getState()),
        // TODO: include other state, e.g.: boardId, meta.storyboarderFilePath, etc
      }
      sendStateToServer({ state })
    })

    ReactDOM.render(
      <Provider store={store}>
        <SceneManagerXR />
      </Provider>,
      document.getElementById('main')
    )
  })

const sendStateToServer = ({ state }) => {
  fetch(
    '/state.json',
    {
      method: 'POST',
      body: JSON.stringify(state),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  )
    .then(response => response.json())
    .then(result => {
    })
    .catch(err => {
      console.error(err)
    })
}
