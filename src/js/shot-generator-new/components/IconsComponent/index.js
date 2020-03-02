import React, { useEffect, useRef } from 'react'
import { useUpdate } from 'react-three-fiber'
import IconsSprites from './IconSprites'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
const IconsComponent = React.memo(({type, text, auxiliaryText = null, sceneObject, fontMesh, ...props}) => {
    const ref = useUpdate(
        self => {
          self.traverse(child => child.layers.enable(SHOT_LAYERS))
        }
      )
    const iconsSprites = useRef()
    useEffect(() => {
        if(!fontMesh) return
        iconsSprites.current = new IconsSprites(type, fontMesh)
        text && iconsSprites.current.addText(text, 1, { x: 0.7, y: 0, z: 0 })
        auxiliaryText && iconsSprites.current.addText(auxiliaryText, 2, { x: 0.7, y: 0, z: 0.39 })
        iconsSprites.current.icon.material.rotation = translateRotation(sceneObject)
        ref.current.add(iconsSprites.current)
    }, [fontMesh])

    useEffect(() => {
        iconsSprites.current.icon.material.rotation = translateRotation(sceneObject)
        iconsSprites.current.icon.updateMatrixWorld(true)
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

    useEffect(() => {
        if(!iconsSprites.current) return
        iconsSprites.current.setSelected(props.isSelected)
      }, [props.isSelected])

    const { x, y, z } = sceneObject
    return <group 
    ref={ ref }
    position={ [x, z + 1, y] }
    visible={ sceneObject.visible }
    scale={ [1, 1, 1] }
    onController={ sceneObject.visible ? () => null : null }
    userData={{
        type:type,
        id:sceneObject.id,
        name: sceneObject.name,
        locked: sceneObject.locked
    }}
    { ...props }
    >
    </group>
})

const translateRotation = (sceneObject) => {
    switch(sceneObject.type) {
        case 'character':
            return sceneObject.rotation + Math.PI
        case 'light':
            let addRotation = sceneObject.tilt>=0 ? 0 : Math.PI
            return sceneObject.rotation + addRotation
        case 'volume':
            return sceneObject.rotation
        case 'image': 
            return sceneObject.rotation.y
    }
}

export default IconsComponent
