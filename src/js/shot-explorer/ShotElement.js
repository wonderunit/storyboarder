import React, { useEffect, useState, useMemo } from 'react'
import { render } from 'react-three-fiber'

const ShotElement = React.memo((
    {
        setSelectedShot, 
        object,
        aspectRatio,
        scale
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
       // return object.renderImage
        setRenderImage(object.renderImage)
    }, [object.renderImage, imageChanged])

    useEffect(() => {
        console.log("Image changed")
    }, [renderImage])

    return <div className="shot-explorer-shot" style={{  minWidth:  ((900 * aspectRatio) / scale) / 3, maxWidth:  ((900 * aspectRatio) / scale) / 3, height: (900 / scale) / 3 }}>
            <img className="shot-explorer-image" src={ renderImage } onPointerDown={() =>{ setSelectedShot(object) }}/>
            <div style={{overflow: "hidden", fontSize: "12px"}}>{object.toString()}</div>
        </div>
})

export default ShotElement