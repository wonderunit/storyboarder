import React, { useEffect, useState } from 'react'

const ShotElement = React.memo((
    {
        setSelectedShot, 
        object,
        aspectRatio,
        scale
}) => {
    
    const [renderImage, setRenderImage] = useState('') 
    
    useEffect(() => {
        setRenderImage(object.renderImage)
    }, [object.renderImage])

    return <div className="shot-explorer-shot" style={{  minWidth:  ((900 * aspectRatio) / scale) / 3, maxWidth:  ((900 * aspectRatio) / scale) / 3, height: (900 / scale) / 3 }}>
            <img className="shot-explorer-image" src={renderImage} onPointerDown={() =>{ setSelectedShot(object) }}/>
            <div style={{overflow: "hidden", fontSize: "12px"}}>{object.toString()}</div>
        </div>
})

export default ShotElement