import React, { useEffect, useState, useMemo } from 'react'
import { render } from 'react-three-fiber'

const ShotElement = React.memo((
    {
        setSelectedShot, 
        object,
        aspectRatio,
        scale,
        defaultWidth,
        windowWidth
}) => {
    
    const [renderImage, setRenderImage] = useState() 
    const [imageChanged, setImageChanged] = useState({})

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

    const paddingSize = 10
    const width = ((defaultWidth * aspectRatio)) / 3 - paddingSize
    return <div className="shot-explorer-element" style={{ width: windowWidth / 3 - paddingSize }}> 
            <div className="shot-explorer-shot" style={{ width, maxHeight: (defaultWidth) / 3 - paddingSize }}>
                <img className="shot-explorer-image" src={ renderImage } onPointerDown={() =>{ setSelectedShot(object) }}/>
            </div>
            <div className="description">{object.toString()}</div>
        </div>
})

export default ShotElement