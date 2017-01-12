const fs = require('fs')
const {app} = require('electron')

let prefs

let prefModule = {
  loadPrefs: function () {
    let prefFile = app.getPath('userData') + '/pref.json'
    try {
      prefs = JSON.parse(fs.readFileSync(prefFile))
    } catch (e) {
      console.log(e)
      prefs = {scriptFile: `./outl3ine.txt`}

      try {
        fs.writeFileSync(prefFile, JSON.stringify(prefs))
      } catch (e) {
        console.log(e)
      }
    }
  }, 
  savePrefs: function (prefs) {
    let prefFile = app.getPath('userData') + '/pref.json'
    fs.writeFileSync(prefFile, JSON.stringify(prefs))
  },
  getPrefs: function(){return prefs},
}

prefModule.loadPrefs()

module.exports = prefModule