import React, { useEffect, useRef } from 'react'
import IconSprites from '../../../IconSprites'

const CameraIcon = React.memo(({type, text, secondText, sceneObject}) => {
    const ref = useRef()
    const iconsSprites = useRef()
    const frustumIcons = useRef()
    useEffect(() => {
        iconsSprites.current = new IconSprites(type, text, ref.current, Math.round(sceneObject.fov) + "mm, " + sceneObject.z.toFixed(2) + "m")
        ref.current.add(iconsSprites.current)
        //ref.current.rotation.y = sceneObject.y
        iconsSprites.current.icon.material.rotation = ref.current.rotation.y
        frustumIcons.current = new THREE.Object3D()

        frustumIcons.current.left = new IconSprites( 'object', '', ref.current )
        frustumIcons.current.right = new IconSprites( 'object', '', ref.current )
        frustumIcons.current.left.scale.set(0.06, 2.5, 1)
        frustumIcons.current.right.scale.set(0.06, 2.5, 1)
        //frustumIcons.left.icon.position.z = -0.3
        frustumIcons.current.left.icon.center = new THREE.Vector2(0.5, -0.2)
        frustumIcons.current.right.icon.center = new THREE.Vector2(0.5, -0.2)
        console.log(ref.current)
        let hFOV = 2 * Math.atan( Math.tan( sceneObject.fov * Math.PI / 180 / 2 ) * 1 )
        frustumIcons.current.left.icon.material.rotation = hFOV/2 + ref.current.rotation.y
        frustumIcons.current.right.icon.material.rotation = -hFOV/2 + ref.current.rotation.y
        frustumIcons.current.add(frustumIcons.current.left)
        frustumIcons.current.add(frustumIcons.current.right)
        iconsSprites.current.add(frustumIcons.current)

    }, [])

    useEffect(() => {
        if (ref.current) {
           // let rotation = new THREE.Euler().setFromQuaternion( camera.current.quaternion, "YXZ" )
           iconsSprites.current.icon.material.rotation = sceneObject.rotation
            
            let hFOV = 2 * Math.atan( Math.tan( sceneObject.fov * Math.PI / 180 / 2 ) * 1 )
            frustumIcons.current.left.icon.material.rotation = hFOV/2 + sceneObject.rotation
            frustumIcons.current.right.icon.material.rotation = -hFOV/2 + sceneObject.rotation
            
            let focal = sceneObject.fov
            let meters = parseFloat(Math.round(sceneObject.z * 100) / 100).toFixed(2)
            if (iconsSprites.current.iconSecondText)
                iconsSprites.current.changeSecondText(`${Math.round(focal)}mm, ${meters}m`)
        }   
    }, [sceneObject])

    const { x, y, z, rotation} = sceneObject
    console.log(sceneObject)
    return <group 
        ref={ ref }
        position={ [x, z, y] }
        visible={ true }
        rotation={ [0, rotation, 0] }
        userData={{
            type:type
        }}
    >
    </group>
})

export default CameraIcon
