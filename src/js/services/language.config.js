const path = require('path')
const { app } = process && process.type == 'renderer'
  ? require('@electron/remote')
  : require('electron')

const SettingsService = require('../windows/shot-generator/SettingsService')

const userDataPath = app.getPath('userData')
const settings = new SettingsService(
  path.join(userDataPath, 'locales', 'language-settings.json')
)

module.exports = { 
    settings
}