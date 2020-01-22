import React, { useEffect, useRef } from 'react'
import IconsSprites from '../../IconSprites'

const IconsComponent = React.memo(({type, text, secondText, sceneObject}) => {
    const ref = useRef()
    const iconsSprites = useRef()
    useEffect(() => {
        iconsSprites.current = new IconsSprites(type, text, secondText)
        ref.current.add(iconsSprites.current)
        ref.current.rotation.y = sceneObject.y
    }, [])
    const { x, y, z, rotation} = sceneObject
    return <group 
    ref={ ref }
    position={ [x, z, y] }
    visible={ true }
   // rotation={ [0, rotation.y, 0] }
    scale={ [sceneObject.width+0.2, sceneObject.depth+0.2, 1] }
    userData={{
        type:type
    }}
    >
    </group>
})

export default IconsComponent
