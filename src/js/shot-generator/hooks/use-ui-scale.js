import React, { useRef, useMemo, useCallback } from 'react'
import path from 'path'
import SettingsService from '../../windows/shot-generator/SettingsService'
import AutoUIScale from '../../utils/AutoUIScaler'
const { webFrame } = electron
const { app } = electron.remote

const useUIScale = () => {
    const settingsService = useRef()
    const autoUIScale = useRef()
    const scaleBy = useCallback(( event, value ) => {
        autoUIScale.current.scaleBy(value)
    }, [])
    
    const setScale = useCallback(( event, value ) => {
        autoUIScale.current.setScale(value)
    }, [])
    
    const updateScaleBoundaries = () => {
        let currentBound = electron.remote.getCurrentWindow().getBounds()
        autoUIScale.current.updateScaleBoundaries(currentBound)
    }
    
    const resizeScale = () => {
        updateScaleBoundaries()
        autoUIScale.current.updateScale()
    }

    const onChange = ( scale ) => {
        webFrame.setZoomFactor(scale)
        settingsService.current.setSettings({scale})
    } 
    
    useMemo(() =>{
        const scaleDefault = { max: 1.2, min: 0.6 }
        const minimalWindowSize = { height: 768, width:1024 }
        settingsService.current = new SettingsService(path.join(app.getPath('userData'), 'shot-generator-settings.json'))
        let currentWindow = electron.remote.getCurrentWindow()
        let settingsZoom = settingsService.current.getSettingByKey('scale')
        let scale 
        if(!settingsZoom && currentWindow.getBounds().height < minimalWindowSize.height) {
            scale = scaleDefault.min
        } else {
            settingsZoom = settingsZoom !== undefined && settingsZoom >= 1 ? settingsZoom : 1
            scale = settingsZoom
        }
        webFrame.setZoomFactor(scale)
        autoUIScale.current = new AutoUIScale(scaleDefault, minimalWindowSize, scale, onChange)
        updateScaleBoundaries()
        autoUIScale.current.updateScale()
    }, [])

    return { setScale, scaleBy, resizeScale }
}
export default useUIScale