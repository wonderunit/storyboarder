
const electron = require('electron')
const path = require('path')
const { app } = electron.remote
const { webFrame } = electron
const SettingsService = require("../windows/shot-generator/SettingsService")
const AutoUIScaler = require('./AutoUIScaler')
const settingsService = new SettingsService(path.join(app.getPath("userData"), "storyboarder-settings.json"));
let scaleDefault = { max: 1.2, min: 0.7 }
let uiScaler 
let onChange = (scale) => {    
    webFrame.setZoomFactor(scale)
    settingsService.setSettings({scale})
}
const initialize = () => {
    let currentWindow = electron.remote.getCurrentWindow()
    let settingsZoom = settingsService.getSettingByKey("scale")
    let scale 
    if(!settingsZoom && currentWindow.getBounds().height < 768) {
        scale = scaleDefault.min
    } else {
        settingsZoom = settingsZoom !== undefined && settingsZoom >= 1 ? settingsZoom : 1
        scale = settingsZoom
    }
    webFrame.setZoomFactor(scale)
    uiScaler = new AutoUIScaler({ max: scaleDefault.max, min: scaleDefault.min }, {height:768, width:1024}, scale, onChange)
    updateScaleBoundaries()
    uiScaler.scale = webFrame.getZoomFactor() - uiScaler.currentScaleLimits.max + uiScaler.defaultScaleLimits.max

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