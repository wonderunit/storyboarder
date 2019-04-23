const THREE = require('three')
window.THREE = THREE

const React = require('react')
const { createStore, applyMiddleware } = require('redux')
const ReactDOM = require('react-dom')

const { Provider, connect } = require('react-redux')

const thunkMiddleware = require('redux-thunk').default

const h = require('../../utils/h')
const { reducer } = require('../../shared/reducers/shot-generator')

const configureStore = preloadedState => {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware))
  return store
}

const Output = connect(
  state => ({
    world: state.world,
    sceneObjects: state.sceneObjects
  })
)(({ sceneObjects }) => {

  let list = Object.values(sceneObjects).map(sceneObject => {
    return ['div', sceneObject.id + ": " + sceneObject.type]
  })

  return h(['div', [
    ['div', 'Scene:'],
    list
  ]])
})

fetch('/state.json')
  .then(response => response.json())
  .then(result => {
    const store = configureStore(result)

    ReactDOM.render(
      h([
        Provider, { store }, [
          Output
        ]
      ]),
      document.getElementById('main')
    )
  })
