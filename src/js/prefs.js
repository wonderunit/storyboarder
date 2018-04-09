const fs = require('fs')
const path = require('path')
const { app } = require('electron')
const os = require("os")
const R = require('ramda')

const pkg = require('../../package.json')
const util = require('./utils/index') // for Object.equals

let prefFile

const defaultPrefs = {
  version: pkg.version,
  enableDrawingSoundEffects: false,
  enableDrawingMelodySoundEffects: false,
  enableUISoundEffects: false,
  enableHighQualityAudio: false,
  enableTooltips: true,
  enableAspirationalMessages: true,
  defaultBoardTiming: 2000,
  pomodoroTimerMinutes: 25,
  importTargetLayer: "reference",
  enableCanvasPaintingOpacity: true, // DEPRECATED used by old SketchPane
  enableBrushCursor: true,
  enableStabilizer: true,
  enableAnalytics: true,
  enableAutoSave: true,
  enableForcePsdReloadOnFocus: true,
  absolutePathToImageEditor: undefined,
  
  lastUsedFps: 24,

  // notifications
  allowNotificationsForLineMileage: true,

  import: {
    offset: [0, 0],
    skipBlankBoards: true
  },

  enableBoardAudition: true
}

// For slow computers, override the defaults here.
let cpus = os.cpus()
let cpu = cpus[0]
if(cpus.length <= 2 || cpu.speed <= 2000) {
  defaultPrefs.enableDrawingSoundEffects = false
  defaultPrefs.enableDrawingMelodySoundEffects = false
  defaultPrefs.enableUISoundEffects = false
  defaultPrefs.enableCanvasPaintingOpacity = false // DEPRECATED used by old SketchPane
  defaultPrefs.enableStabilizer = false
}

let prefs

const load = () => {
  try {
    // load existing prefs
    // console.log("READING FROM DISK")
    prefs = JSON.parse(fs.readFileSync(prefFile))
  } catch (e) {
    console.error('Could not read prefs. Loading defaults.')
    prefs = defaultPrefs
    try {
      savePrefs(prefs)
    } catch (e) {
      //console.log(e)
    }
  }
}

const savePrefs = (newPref) => {
  // console.log('SAVEPREFS')
  if (!newPref) return
  if (Object.equals(newPref,prefs)) {
    // console.log("IM THE SAME!!!!")
  } else {
    prefs = newPref
    // console.log("SAVING TO DISK")
    fs.writeFileSync(prefFile, JSON.stringify(newPref, null, 2))
  }
}

const set = (keyPath, value, sync) => {
  // console.log('SETTING')
  const keys = keyPath.split(/\./)
  let obj = prefs
  while (keys.length > 1) {
    const key = keys.shift()
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      obj[key] = {}
    }
    obj = obj[key]
  }
  let keyProp = keys.shift()
  let prevValue = obj[keyProp]
  if (Object.equals(prevValue,value)) {
    //console.log("IM THE SAME!!!!")
  } else {
    obj[keyProp] = value
    //console.log("SAVING TO DISK")
    //console.log(prefs)
    if (sync) {
      fs.writeFileSync(prefFile, JSON.stringify(prefs, null, 2))
    } else {
      fs.writeFile(prefFile, JSON.stringify(prefs, null, 2), (err) => {
        // console.log("SAVED ASYNC")
      })
    }
  }
}

const getPrefs = (from) => {
  // console.log("GETTING PREFS!!!", from)
  return util.stringifyClone(prefs) // TODO why do we have to clone this?
}

const migrate = (_currentPrefs, _defaultPrefs) => {
  console.log(`Migrating preferences from ${_currentPrefs.version} to v${_defaultPrefs.version}`)

  // Set properties only if they don't exist
  // via https://github.com/ramda/ramda/wiki/Cookbook#set-properties-only-if-they-dont-exist
  let mergedPrefs = Object.assign(
    R.merge(_defaultPrefs, _currentPrefs),
    { version: _defaultPrefs.version }
  )

  return mergedPrefs
}

const compareVersions = (v1, v2) => {
  for (let i = 0; i < v1.length; i++) {
    if (v1[i] < v2[i]) {
      return -1
    } else if (v1[i] > v2[i]) {
      return +1
    }
  }

  return 0
}

// naive check, assumes lengths are equal and format is simply `major.minor.patch`
const versionCanBeMigrated = (from, to) => {
  let v1 = from.split('.').map(n => parseInt(n, 10))
  let v2 = to.split('.').map(n => parseInt(n, 10))
  return compareVersions(v1, v2) === -1
}

const init = _prefFile => {
  prefFile = _prefFile
  console.log('Loading preferences from', prefFile)

  load()
  if (versionCanBeMigrated(prefs.version, defaultPrefs.version)) {
    let newPrefs = migrate(prefs, defaultPrefs)
    savePrefs(newPrefs)
  }
}

module.exports = {
  savePrefs,
  getPrefs,
  set,

  init,
  versionCanBeMigrated
}
