import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
const ShotElement = React.memo((
    {
        setSelectedShot, 
        object,
        aspectRatio,
        canvasHeight,
        windowWidth
}) => {
    
    const [renderImage, setRenderImage] = useState() 
    const [imageChanged, setImageChanged] = useState({})
    const { t } = useTranslation()
    const updateImage = () => {
        setImageChanged({})
    }

    useEffect(() => {
        object.subscribe(updateImage)
        return () => object.unsubscribe(updateImage)
    }, [object, updateImage])

    useEffect(() => {
        setRenderImage(object.renderImage)
    }, [object.renderImage, imageChanged])

    const paddingSize = 5
    const canvasHeightWithPadding = canvasHeight - (paddingSize * 3)
    const elementWidth = (windowWidth - (paddingSize * 3)) / 3
    let height = (canvasHeightWithPadding / 3)
    const width = ((canvasHeightWithPadding * aspectRatio)) / 3
    return <div className="shot-explorer-element" style={{ width: elementWidth, maxWidth: elementWidth }}> 
            <div className="shot-explorer-shot" style={{ width, height, maxHeight: height }}>
                <img className="shot-explorer-image" src={ renderImage } onPointerDown={() =>{ setSelectedShot(object) }}/>
            </div>
            <div className="description">{object.toString(t)}</div>
        </div>
})

export default ShotElement