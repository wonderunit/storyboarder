const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const pkg = require('../../package.json')

const prefFile = path.join(app.getPath('userData'), 'pref.json')

const defaultPrefs = {
  version: pkg.version,
  enableSoundEffects: true
}

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
      savePrefs()
    } catch (e) {
      //console.log(e)
    }
  }
}

const savePrefs = prefs =>
  fs.writeFileSync(prefFile, JSON.stringify(prefs, null, 2))

const getPrefs = () =>
  prefs

const migrate = () => {
  prefs = Object.assign(defaultPrefs, prefs)
}

const init = () => {
  load()
  if (prefs.version !== defaultPrefs.version) {
    migrate()
    savePrefs()
  }
}

init()

module.exports = {
  savePrefs,
  getPrefs
}
