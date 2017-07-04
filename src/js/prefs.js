const fs = require('fs')
const path = require('path')
const { app } = require('electron')
const EventEmitter = require('events').EventEmitter
module.exports = new EventEmitter()

const pkg = require('../../package.json')
const util = require('./utils/index.js') // for Object.equals

// TODO pref specifics shouldnt be in this module.
const prefFile = path.join(app.getPath('userData'), 'pref.json')

const defaultPrefs = {
  version: pkg.version,
  enableDrawingSoundEffects: true,
  enableDrawingMelodySoundEffects: true,
  enableUISoundEffects: true,
  enableHighQualityAudio: false,
  enableTooltips: true,
  enableAspirationalMessages: true,
  defaultBoardTiming: 2000
}

let prefs

const load = () => {
  try {
    // load existing prefs
    console.log("READING FROM DISK")
    prefs = JSON.parse(fs.readFileSync(prefFile))
  } catch (e) {
    prefs = defaultPrefs
    try {
      savePrefs(prefs)
    } catch (e) {
      //console.log(e)
    }
  }
}

const savePrefs = (newPref) => {
  console.log('SAVEPREFS')
  if (!newPref) return
  if (Object.equals(newPref,prefs)) {
    console.log("IM THE SAME!!!!")
  } else {
    prefs = newPref
    console.log("SAVING TO DISK")
    fs.writeFileSync(prefFile, JSON.stringify(newPref, null, 2))
  }
  module.exports.emit('changed', newPref)
}

const set = (keyPath, value, sync) => {
  console.log('SETTING')
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
      module.exports.emit('changed', prefs)
    } else {
      fs.writeFile(prefFile, JSON.stringify(prefs, null, 2), (err) => {
        console.log("SAVED ASYNC")
        module.exports.emit('changed', prefs)
      })
    }
  }
}

const getPrefs = (from) => {
  console.log("GETTING PREFS!!!", from)
  return prefs
}

const migrate = () => {
  prefs = Object.assign(defaultPrefs, prefs)
}

const init = () => {
  //console.log("I AM INIT")
  load()
  if (prefs.version !== defaultPrefs.version) {
    migrate()
    savePrefs(prefs)
  }
}

init()

module.exports.savePrefs = savePrefs
module.exports.getPrefs = getPrefs
module.exports.set = set
