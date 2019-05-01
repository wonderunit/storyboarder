const THREE = require('three')
window.THREE = THREE

const React = require('react')
const { createStore, applyMiddleware } = require('redux')
const ReactDOM = require('react-dom')

const { Provider, connect } = require('react-redux')

const thunkMiddleware = require('redux-thunk').default

const h = require('../../utils/h')
const { reducer, initialState } = require('../../shared/reducers/shot-generator')

const configureStore = preloadedState => {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware))
  window.$r = { store }
  return store
}

const SceneManagerXR = require('./SceneManagerXR')

fetch('/state.json')
  .then(response => response.json())
  .then(result => {
    const store = configureStore({
      ...result,
      models: initialState.models,
      presets: {
        poses: {}
      }
    })

    ReactDOM.render(
      <Provider store={store}>
        <SceneManagerXR />
      </Provider>,
      document.getElementById('main')
    )
  })
