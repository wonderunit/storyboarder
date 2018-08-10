const { combineReducers } = require('redux')
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

const preferences = require('./preferences')

const sceneFilePath = (state = null, action) => {
  switch (action.type) {
    case 'SCENE_FILE_LOADED':
      return action.payload.path

    default:
      return state
  }
}

const toolbar = require('./toolbar')

const license = (state = {}, action) => {
  switch (action.type) {
    case 'SET_LICENSE':
      return Object.assign(
        {},
        state,
        action.payload
      )

    default:
      return state
  }
}

const auth = (state = {}, action) => {
  switch (action.type) {
    case 'SET_AUTH':
      return Object.assign(
        {},
        state,
        {
          [action.payload.service]: action.payload
        }
      )

    case 'CLEAR_AUTH':
      return {}

    default:
      return state
  }
}

module.exports = combineReducers({
  entities: combineReducers({
    keymap
  }),
  preferences,
  sceneFilePath,
  toolbar,
  license,
  auth
})
