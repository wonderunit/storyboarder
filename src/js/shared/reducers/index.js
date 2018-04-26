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

module.exports = combineReducers({
  entities: combineReducers({
    keymap
  }),
  preferences,
  sceneFilePath,
  toolbar
})
