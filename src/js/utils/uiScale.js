
const electron = require('electron')
const path = require('path')
const { app } = electron.remote
const { webFrame } = electron
const SettingsService = require('../windows/shot-generator/SettingsService')
const AutoUIScaler = require('./AutoUIScaler')
let settingsService
let uiScaler 
let onChange = ( scale ) => {    
    webFrame.setZoomFactor(scale)
    settingsService.setSettings({scale})
}

const scaleBy = ( value ) => {
    uiScaler.scaleBy(value)
}

const setScale = ( value ) => {
    uiScaler.setScale(value)
}

const updateScaleBoundaries = () => {
    let currentBound = electron.remote.getCurrentWindow().getBounds()
    uiScaler.updateScaleBoundaries(currentBound)
}
const resizeScale = () => {
    updateScaleBoundaries()
    uiScaler.updateScale()
}

const initialize = () => {
    const scaleDefault = { max: 1.2, min: 0.7 }
    const minimalWindowSize = { height: 768, width:1024 }
    settingsService = new SettingsService(path.join(app.getPath('userData'), 'storyboarder-settings.json'))
    let currentWindow = electron.remote.getCurrentWindow()
    let settingsZoom = settingsService.getSettingByKey('scale')
    let scale 
    if(!settingsZoom && currentWindow.getBounds().height < minimalWindowSize.height) {
        scale = scaleDefault.min
    } else {
        settingsZoom = settingsZoom !== undefined && settingsZoom >= 1 ? settingsZoom : 1
        scale = settingsZoom
    }
    webFrame.setZoomFactor(scale)
    uiScaler = new AutoUIScaler({ max: scaleDefault.max, min: scaleDefault.min }, minimalWindowSize, scale, onChange)
    updateScaleBoundaries()
    uiScaler.updateScale()
}

module.exports = {
    scaleBy,
    setScale,
    resizeScale,
    initialize
}