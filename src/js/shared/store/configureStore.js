// via https://github.com/hardchor/timesheets/blob/759f5b5fdea302f6792d79bdada35f99995c0a15/app/shared/store/configureStore.js
const { createStore, applyMiddleware } = require('redux')
const { forwardToMain, forwardToRenderer, replayActionMain, replayActionRenderer, triggerAlias } = require('electron-redux')
const thunk = require('redux-thunk').default
const promise = require('redux-promise')
const throttle = require('lodash.throttle')

const reducers = require('../reducers')
const authStorage = require('./authStorage')

const configureStore = (initialState, scope = 'main') => {
  let middleware = [
    thunk,
    promise
  ]

  if (scope === 'renderer') {
    middleware = [
      forwardToMain,
      ...middleware
    ]
  }

  if (scope === 'main') {
    middleware = [
      triggerAlias,
      ...middleware,
      forwardToRenderer
    ]
  }

  const persistedState = authStorage.loadState()
  const store = createStore(
    reducers,
    { ...persistedState, ...initialState },
    applyMiddleware(...middleware)
  )

  if (scope === 'main') {
    replayActionMain(store)
  } else {
    replayActionRenderer(store)
  }

  store.subscribe(
    throttle(
      () => authStorage.saveState({ auth: store.getState().auth }),
      5000
    )
  )

  return store
}

module.exports = configureStore
