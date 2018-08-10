// via https://egghead.io/lessons/javascript-redux-persisting-the-state-to-the-local-storage
const { app } = electron = require('electron')
const fs = require('fs')
const jwt = require('jsonwebtoken')
const path = require('path')

const getAuthFilePath = () => path.join(app.getPath('userData'), 'auth.json')

module.exports = {
  loadState: () => {
    try {
      let data = fs.readFileSync(getAuthFilePath())
      let deserializedState = JSON.parse(data)
      return { auth: deserializedState }
    } catch (err) {
      return undefined
    }
  },

  // TODO for better performance, memoize and only save on actual change
  saveState: (state) => {
    try {
      let serializedState = JSON.stringify(state.auth)
      fs.writeFileSync(getAuthFilePath(), serializedState)
    } catch (err) {
      // ignore write errors.
    }
  }
}
