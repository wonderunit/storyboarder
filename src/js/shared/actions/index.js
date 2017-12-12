// action creators
const { createAliasedAction } = require('electron-redux')

const { promisify } = require('util')
const fs = require('fs')
const readFileAsync = promisify(fs.readFile)

const setKeyMap = createAliasedAction(
  'SET_KEYMAP',
  payload => {
    return dispatch => {
      dispatch({
        type: 'SET_KEYMAP',
        payload
      })
    }
  }
)

module.exports = {
  setKeyMap
}
