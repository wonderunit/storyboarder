// reference:
// https://redux.js.org/usage/configuring-your-store
// https://github.com/klarna/electron-redux/tree/alpha

const { createStore, applyMiddleware } = require('redux')
const { composeWithStateSync } = process.type == 'renderer'
  ? require('electron-redux/renderer')
  : require('electron-redux/main')
const thunk = require('redux-thunk').default
const promise = require('redux-promise')

const rootReducer = require('../reducers')

const configureStore = (preloadedState) => {
  let middleware = [thunk, promise]
  let middlewareEnhancer = applyMiddleware(...middleware)

  let enhancers = [middlewareEnhancer]
  let composedEnhancers = composeWithStateSync(...enhancers)

  const store = createStore(
    rootReducer,
    preloadedState,
    composedEnhancers
  )

  return store
}

module.exports = configureStore
