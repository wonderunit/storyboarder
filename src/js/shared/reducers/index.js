const { combineReducers } = require('redux')
const defaultKeyMap = require('../helpers/defaultKeyMap')

const toolbar = require('./toolbar')

const sceneFilePath = (state = null, action) => {
  switch (action.type) {
    case 'SCENE_FILE_LOADED':
      return action.payload.path

    default:
      return state
  }
}

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
  sceneFilePath,
  toolbar,
  entities: combineReducers({
    keymap
  })
})
