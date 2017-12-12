const { createStore, applyMiddleware, combineReducers } = require('redux')
const defaultKeyMap = require('../helpers/defaultKeyMap')
const keymap = (state = defaultKeyMap, action) => {
  switch (action.type) {
    case 'SET_KEYMAP':
      return Object.assign(
        {},
        state,
        action.payload
      )

    default:
      return state
  }
}

module.exports = combineReducers({
  entities: combineReducers({
    keymap
  })
})
