import React, { useEffect, useState, useMemo } from 'react'
import { render } from 'react-three-fiber'

const ShotElement = React.memo((
    {
        setSelectedShot, 
        object,
        aspectRatio,
        scale,
        defaultWidth
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

    const paddingSize = 5 * aspectRatio
    const width = ((defaultWidth * aspectRatio)) / 3 - paddingSize
    return <div className="shot-explorer-shot" style={{  minWidth:  width, maxWidth: width, height: (defaultWidth) / 3 - paddingSize }}>
            <img className="shot-explorer-image" src={ renderImage } onPointerDown={() =>{ setSelectedShot(object) }}/>
            <div className="description">{object.toString()}</div>
        </div>
})

export default ShotElement