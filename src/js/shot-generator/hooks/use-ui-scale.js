import React, { useRef, useMemo, useCallback } from 'react'
import path from 'path'
import SettingsService from '../../windows/shot-generator/SettingsService'
import AutoUIScale from '../../utils/AutoUIScaler'
const { webFrame } = electron
const { app } = electron.remote

const useUIScale = () => {
    const settingsService = useRef()
    const autoUIScale = useRef()
    const scaleBy = useCallback((event, value) => {
        webFrame.setLayoutZoomLevelLimits(autoUIScale.current.currentScaleLimits.min, autoUIScale.current.currentScaleLimits.max)
        autoUIScale.current.scaleBy(value)
    }, [])
    
    const setScale = useCallback((event, value) => {
        webFrame.setLayoutZoomLevelLimits(autoUIScale.current.currentScaleLimits.min, autoUIScale.current.currentScaleLimits.max)
        autoUIScale.current.setScale(value)
    }, [])
    
    const updateScaleBoundaries = () => {
        let windowMinimumSize = electron.remote.getCurrentWindow().getMinimumSize()
        let currentBound = electron.remote.getCurrentWindow().getBounds()
        autoUIScale.current.updateScaleBoundaries({width: windowMinimumSize[0], height: windowMinimumSize[1]}, currentBound)
    }
    
    const resizeScale = event => {
        updateScaleBoundaries()
        autoUIScale.current.updateScale()
    }

    const onChange = (scale) => {
        webFrame.setZoomLevel(scale)
        settingsService.current.setSettings({scale})
    } 
    
    useMemo(() =>{
        let scaleDefault = { max: 0.4, min: -1.6 }
        settingsService.current = new SettingsService(path.join(app.getPath('userData'), 'shot-generator-settings.json'))
        let currentWindow = electron.remote.getCurrentWindow()
        let settingsZoom = settingsService.current.getSettingByKey("scale")
        let scale 
        if(!settingsZoom && currentWindow.getBounds().height < 768) {
            scale = maxZoom.out
        } else {
            settingsZoom = settingsZoom !== undefined ? settingsZoom : 0
            scale = settingsZoom
        }
        webFrame.setZoomLevel(scale)
        autoUIScale.current = new AutoUIScale(scaleDefault, {width: 1024, height: 768}, scale, onChange)
        webFrame.setLayoutZoomLevelLimits(scaleDefault.scaleDown, scaleDefault.scaleUp)
        updateScaleBoundaries()
        autoUIScale.current.scale = webFrame.getZoomLevel() - autoUIScale.current.currentScaleLimits.min + autoUIScale.current.defaultScaleLimits.min
        autoUIScale.current.updateScale()
    }, [])

    return { setScale, scaleBy, resizeScale }
}
export default useUIScale