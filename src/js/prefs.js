const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const prefFile = path.join(app.getPath('userData'), 'pref.json')

const defaultPrefs = {}

let prefs

const load = () => {
  try {
    // load existing prefs
    prefs = JSON.parse(fs.readFileSync(prefFile))
  } catch (e) {
    //console.log(e)
    prefs = defaultPrefs

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

const getPrefs = () =>
  prefs

load()

module.exports = {
  savePrefs,
  getPrefs
}