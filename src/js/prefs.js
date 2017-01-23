const fs = require('fs')
const path = require('path')
const {app} = require('electron')

let prefs

let prefModule = {
  loadPrefs: function () {
    console.log(app.getPath('userData'))
    let prefFile = path.join(app.getPath('userData'), 'pref.json')
    try {
      prefs = JSON.parse(fs.readFileSync(prefFile))
    } catch (e) {
      //console.log(e)
      prefs = {}

      try {
        fs.writeFileSync(prefFile, JSON.stringify(prefs))
      } catch (e) {
        //console.log(e)
      }
    }
  },
  savePrefs: function (prefs) {
    let prefFile = path.join(app.getPath('userData'), '/pref.json')
    fs.writeFileSync(prefFile, JSON.stringify(prefs))
  },
  getPrefs: function(){return prefs},
}

prefModule.loadPrefs()

module.exports = prefModule
