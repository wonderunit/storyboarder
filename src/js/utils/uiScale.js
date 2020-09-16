
const electron = require('electron')
const path = require('path')
const { app } = electron.remote
const { webFrame } = electron
const SettingsService = require("../windows/shot-generator/SettingsService")
const AutoUIScaler = require('./AutoUIScaler')
const settingsService = new SettingsService(path.join(app.getPath("userData"), "storyboarder-settings.json"));
let scaleDefault = { scaleUp: 0.2, scaleDown: -1.0 }
let uiScaler 
let onChange = (scale) => {    
    webFrame.setZoomLevel(scale)
    settingsService.setSettings({scale})
}
const initialize = () => {
    let currentWindow = electron.remote.getCurrentWindow()
    let settingsZoom = settingsService.getSettingByKey("scale")
    let scale 
    if(!settingsZoom && currentWindow.getBounds().height < 768) {
        scale = scaleDefault.scaleDown
    } else {
        settingsZoom = settingsZoom !== undefined ? settingsZoom : 0
        scale = settingsZoom
    }
    webFrame.setZoomLevel(scale)
    uiScaler = new AutoUIScaler({ max: scaleDefault.scaleUp, min: scaleDefault.scaleDown }, {height:768, width:1024}, scale, onChange)
    webFrame.setLayoutZoomLevelLimits(scaleDefault.scaleDown, scaleDefault.scaleUp)
    updateScaleBoundaries()
    uiScaler.scale = webFrame.getZoomLevel() - uiScaler.currentScaleLimits.min + uiScaler.defaultScaleLimits.min
    uiScaler.updateScale()
}

const scaleBy = (value) => {
    webFrame.setLayoutZoomLevelLimits(uiScaler.currentScaleLimits.min, uiScaler.currentScaleLimits.max)
    uiScaler.scaleBy(value)
}

const setScale = (value) => {
    webFrame.setLayoutZoomLevelLimits(uiScaler.currentScaleLimits.min, uiScaler.currentScaleLimits.max)
    uiScaler.setScale(value)
}

const updateScaleBoundaries = () => {
    let windowMinimumSize = electron.remote.getCurrentWindow().getMinimumSize()
    let currentBound = electron.remote.getCurrentWindow().getBounds()
    uiScaler.updateScaleBoundaries({width: windowMinimumSize[0], height: windowMinimumSize[1]}, currentBound)
}
const resizeScale = event => {
    updateScaleBoundaries()
    uiScaler.updateScale()
}

module.exports = {
    scaleBy,
    setScale,
    resizeScale,
    initialize
}