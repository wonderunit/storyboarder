const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const pkg = require('../../package.json')

const prefFile = path.join(app.getPath('userData'), 'pref.json')
const defaultPrefs = {
  version: pkg.version,
  enableDrawingSoundEffects: true,
  enableDrawingMelodySoundEffects: true,
  enableUISoundEffects: true,
  enableHighQualityAudio: false,
  enableTooltips: true,
  enableAspirationalMessages: true
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
      savePrefs(prefs)
    } catch (e) {
      //console.log(e)
    }
  }
}

const savePrefs = _prefs =>
  fs.writeFileSync(prefFile, JSON.stringify(_prefs, null, 2))

const getPrefs = () =>
  prefs

const migrate = () => {
  prefs = Object.assign(defaultPrefs, prefs)
}

const init = () => {
  load()
  if (prefs.version !== defaultPrefs.version) {
    migrate()
    savePrefs(prefs)
  }
}

init()

module.exports = {
  savePrefs,
  getPrefs
}
