import React, { useRef, useMemo, useCallback } from 'react'
import path from 'path'
import SettingsService from '../../windows/shot-generator/SettingsService'
const { webFrame } = electron
const { app } = electron.remote

const useUIScale = () => {
    const settingsService = useRef()
    const scaleDefault = useRef()
    const scaleInfo = useRef()
    const zoomScaleChanges = useRef()
    const scaleBy = useCallback((event, value) => {
        webFrame.setLayoutZoomLevelLimits(scaleInfo.current.scaleDown, scaleInfo.current.scaleUp)
        let zoomLevel = webFrame.getZoomLevel()
        let scale = zoomLevel + value 
        scale = scale >= scaleInfo.current.scaleUp ? scaleInfo.current.scaleUp : scale <= scaleInfo.current.scaleDown ? scaleInfo.current.scaleDown : scale
        webFrame.setZoomLevel(scale)
        settingsService.current.setSettings({scale})
        scale = scaleInfo.current.currentScale + value 
        scaleInfo.current.currentScale = scale >= scaleDefault.current.scaleUp ? scaleDefault.current.scaleUp : scale <= scaleDefault.current.scaleDown ? scaleDefault.current.scaleDown : scale
    }, [])
    
    const setScale = useCallback((event, value) => {
        webFrame.setLayoutZoomLevelLimits(scaleInfo.current.scaleDown, scaleInfo.current.scaleUp)
        let scale = value >= scaleInfo.current.scaleUp ? scaleInfo.current.scaleUp : value <= scaleInfo.current.scaleDown ? scaleInfo.current.scaleDown : value
        webFrame.setZoomLevel(scale)
        settingsService.current.setSettings({scale})
    }, [])
    
    const updateScaleBoundaries = () => {
        let windowMinimumSize = electron.remote.getCurrentWindow().getMinimumSize()
        let currentBound =electron.remote.getCurrentWindow().getBounds()
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
    
        scaleInfo.current.scaleDown = scaleDefault.current.scaleDown + addToZoom
        scaleInfo.current.scaleUp = scaleDefault.current.scaleUp + addToZoom
        zoomScaleChanges.current = addToZoom
    }
    
    const updateCurrentScale = () => {
        let zoomLevel = scaleInfo.current.currentScale + zoomScaleChanges.current
        setScale({}, zoomLevel)
    }
    
    const resizeScale = event => {
        updateScaleBoundaries()
        updateCurrentScale()
    }
    
    useMemo(() =>{
        scaleDefault.current = { scaleUp: 0.4, scaleDown: -1.6 }
        scaleInfo.current = { scaleUp: scaleDefault.current.scaleUp, scaleDown: scaleDefault.current.scaleDown, currentScale: 0 }

        webFrame.setLayoutZoomLevelLimits(scaleInfo.current.scaleDown, scaleInfo.current.scaleUp)
        settingsService.current = new SettingsService(path.join(app.getPath('userData'), 'shot-generator-settings.json'))
        let currentWindow = electron.remote.getCurrentWindow()
        let settingsZoom = settingsService.current.getSettingByKey("zoom")
        if(!settingsZoom && currentWindow.getBounds().height < 768) {
          webFrame.setZoomLevel(maxZoom.out)
        } else {
          settingsZoom = settingsZoom !== undefined ? settingsZoom : 0
          webFrame.setZoomLevel(settingsZoom)
        }
        updateScaleBoundaries()
        scaleInfo.current.currentScale = webFrame.getZoomLevel() - scaleInfo.current.scaleDown + scaleDefault.current.scaleDown
        updateCurrentScale()
    }, [])

    return { setScale, scaleBy, resizeScale }
}
export default useUIScale