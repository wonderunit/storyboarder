const SettingsService = require('../windows/shot-generator/SettingsService')
const Electron = require('electron')
const path = require('path')
const electronApp = Electron.app ? Electron.app : Electron.remote.app
const userDataPath = electronApp.getPath('userData')
const settings = new SettingsService(path.join(userDataPath, 'locales', 'language-settings.json'))
module.exports = { 
    settings
}