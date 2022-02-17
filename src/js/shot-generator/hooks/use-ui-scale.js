import React, { useMemo, useCallback } from 'react'
import path from 'path'
const { app } = require('@electron/remote')
import UIScaler from '../../utils/uiScale'
const useUIScale = () => {
    const scaleBy = useCallback(( event, value ) => {
        UIScaler.scaleBy(value)
    }, [])
    
    const setScale = useCallback(( event, value ) => {
        UIScaler.setScale(value)
    }, [])
    
    useMemo(() => {
        UIScaler.initialize(path.join(app.getPath('userData'), 'shot-generator-settings.json'), {max: 1.2, min: 0.6})
    }, [])

    return { setScale, scaleBy, resizeScale: UIScaler.resizeScale }
}
export default useUIScale