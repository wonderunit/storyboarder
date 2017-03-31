const fs = require('fs')
const path = require('path')
const { app } = require('electron')

module.exports = (() => {
  let prefFile = path.join(app.getPath('userData'), 'pref.json')

  let prefs

  const load = () => {
    try {
      // load existing prefs
      prefs = JSON.parse(fs.readFileSync(prefFile))
    } catch (e) {
      //console.log(e)
      prefs = {}

      try {
        // create new prefs
        fs.writeFileSync(prefFile, JSON.stringify(prefs, null, 2))
      } catch (e) {
        //console.log(e)
      }
    }
  }

  const savePrefs = prefs =>
    fs.writeFileSync(prefFile, JSON.stringify(prefs, null, 2))

  const getPrefs = () => prefs

  load()

  return {
    savePrefs,
    getPrefs
  }
})()