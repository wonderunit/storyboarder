
const electron = require('electron')
const path = require('path')
const { app } = electron.remote
const { webFrame } = electron
const SettingsService = require("../windows/shot-generator/SettingsService")

const settingsService = new SettingsService(path.join(app.getPath("userData"), "storyboarder-settings.json"));
let scaleDefault = { scaleUp: 0.2, scaleDown: -1.0 }
let scaleInfo = { scaleUp: scaleDefault.scaleUp, scaleDown: scaleDefault.scaleDown, currentScale: 0 }
let zoomScaleChanges = 0

const initialize = () => {
    let currentWindow = electron.remote.getCurrentWindow()
    let settingsZoom = settingsService.getSettingByKey("zoom")
    if(!settingsZoom && currentWindow.getBounds().height < 768) {
      webFrame.setZoomLevel(scaleDefault.out)
    } else {
      settingsZoom = settingsZoom !== undefined ? settingsZoom : 0
      webFrame.setZoomLevel(settingsZoom)
    }
    updateScaleBoundaries()
    scaleInfo.currentScale = webFrame.getZoomLevel() - scaleInfo.scaleDown + scaleDefault.scaleDown
    updateCurrentScale()
}

const scaleBy = (value) => {
    webFrame.setLayoutZoomLevelLimits(scaleInfo.scaleDown, scaleInfo.scaleUp)
    let zoomLevel = webFrame.getZoomLevel()
    let scale = zoomLevel + value 
    scale = scale >= scaleInfo.scaleUp ? scaleInfo.scaleUp : scale <= scaleInfo.scaleDown ? scaleInfo.scaleDown : scale
    webFrame.setZoomLevel(scale)
    settingsService.setSettings({scale})
    scale = scaleInfo.currentScale + value 
    scaleInfo.currentScale = scale >= scaleDefault.scaleUp ? scaleDefault.scaleUp : scale <= scaleDefault.scaleDown ? scaleDefault.scaleDown : scale
}

const setScale = (value) => {
    webFrame.setLayoutZoomLevelLimits(scaleInfo.scaleDown, scaleInfo.scaleUp)
    let scale = value >= scaleInfo.scaleUp ? scaleInfo.scaleUp : value <= scaleInfo.scaleDown ? scaleInfo.scaleDown : value
    webFrame.setZoomLevel(scale)
    settingsService.setSettings({scale})
}

const updateScaleBoundaries = () => {
    let windowMinimumSize = electron.remote.getCurrentWindow().getMinimumSize()
    let currentBound = electron.remote.getCurrentWindow().getBounds()
    if(!windowMinimumSize[0] && !windowMinimumSize[1]){
        windowMinimumSize[0] = 1024
        windowMinimumSize[1] = 768
    }

    let addToZoom = 0
    let pixelsDifference

    if(windowMinimumSize[0] > currentBound.width) {
        pixelsDifference = (windowMinimumSize[0] - currentBound.width) / 50
        pixelsDifference = Math.round(pixelsDifference)
        addToZoom += -0.2 * pixelsDifference
    }
    if(windowMinimumSize[1] > currentBound.height) {
        pixelsDifference = (windowMinimumSize[1] - currentBound.height) / 50
        pixelsDifference = Math.round(pixelsDifference)
        addToZoom += -0.2 * pixelsDifference
    }

    scaleInfo.scaleDown = scaleDefault.scaleDown + addToZoom
    scaleInfo.scaleUp = scaleDefault.scaleUp + addToZoom
    zoomScaleChanges = addToZoom
}

const updateCurrentScale = () => {
    let zoomLevel = scaleInfo.currentScale + zoomScaleChanges
    setScale(zoomLevel)
}

const resizeScale = event => {
    updateScaleBoundaries()
    updateCurrentScale()
}

module.exports = {
    scaleBy,
    setScale,
    resizeScale,
    initialize
}