const electron = require('electron')
const remote = require('@electron/remote')
const { webFrame } = electron
const SettingsService = require('../windows/shot-generator/SettingsService')
const AutoUIScaler = require('./AutoUIScaler')
let settingsService
let autoUIScaler 
let onChange = ( scale ) => {    
    webFrame.setZoomFactor(scale)
    settingsService.setSettings({scale})
}

const scaleBy = ( value ) => {
    autoUIScaler.scaleBy(value)
}

const setScale = ( value ) => {
    autoUIScaler.setScale(value)
}

const updateScaleBoundaries = () => {
    let currentBound = remote.getCurrentWindow().getBounds()
    autoUIScaler.updateScaleBoundaries(currentBound)
}
const resizeScale = () => {
    updateScaleBoundaries()
    autoUIScaler.updateScale()
}

const initialize = (settingPath, scaleDefault = { max: 1.2, min: 0.7 }) => {
    const minimalWindowSize = { height: 768, width:1024 }
    settingsService = new SettingsService(settingPath)
    let currentWindow = remote.getCurrentWindow()
    let settingsZoom = settingsService.getSettingByKey('scale')
    let scale 
    if(!settingsZoom && currentWindow.getBounds().height < minimalWindowSize.height) {
        scale = scaleDefault.min
    } else {
        settingsZoom = settingsZoom !== null && settingsZoom > 0 ? settingsZoom : 1
        scale = settingsZoom
    }
    webFrame.setZoomFactor(scale)
    autoUIScaler = new AutoUIScaler(scaleDefault, minimalWindowSize, scale, onChange)
    updateScaleBoundaries()
    autoUIScaler.updateScale()
}

module.exports = {
    scaleBy,
    setScale,
    resizeScale,
    initialize
}