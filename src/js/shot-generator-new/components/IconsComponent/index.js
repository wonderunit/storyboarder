import React, { useEffect, useRef } from 'react'
import IconsSprites from '../../IconSprites'

const IconsComponent = React.memo(({type, text, auxiliaryText, sceneObject, fontMesh}) => {
    const ref = useRef()
    const iconsSprites = useRef()
    useEffect(() => {
        if(!fontMesh) return
        iconsSprites.current = new IconsSprites(type, fontMesh)
        text && iconsSprites.current.addText(text, 1, { x: 0.7, y: 0, z: 0 })
        auxiliaryText && iconsSprites.current.addText(auxiliaryText, 2, { x: 0.7, y: 0, z: 0.39 })
        iconsSprites.current.icon.rotation.y = sceneObject.y
        ref.current.add(iconsSprites.current)
    }, [fontMesh])

    useEffect(() => {
        iconsSprites.current.icon.rotation.y = sceneObject.rotation.y
    }, [sceneObject.rotation])

    useEffect(() => {
        if( iconsSprites.current.isTextExists(1) ){
            iconsSprites.current.changeText(1, text)
        }
        else {
            iconsSprites.current.addText(text, 1, { x: 0.7, y: 0, z: 0 })
        }
    }, [text])

    useEffect(() => {
        if( iconsSprites.current.isTextExists(2) ){
            iconsSprites.current.changeText(2, auxiliaryText)
        }
        else {
            iconsSprites.current.addText(auxiliaryText, 2, { x: 0.7, y: 0, z: 0.39 })
        }
    }, [auxiliaryText])

    const { x, y, z} = sceneObject
    console.log(sceneObject.width)
    console.log(sceneObject.depth)
    return <group 
    ref={ ref }
    position={ [x, z, y] }
    visible={ true }
    scale={ [sceneObject.width + 0.2, sceneObject.depth + 0.2, 1] }
    userData={{
        type:type
    }}
    >
    </group>
})

export default IconsComponent
