import React, { useEffect } from 'react'
import { useThree } from 'react-three-fiber'
import { useAsset } from '../../hooks/use-assets-manager'

const SceneBackground = React.memo(({ path, world }) => {
    const {asset: gltf} = useAsset(path[0])
    const { scene } = useThree()
    useEffect(() => {
        scene.background = new THREE.Color(world.backgroundColor)
    }, [world.backgroundColor])

    useEffect(() => {
        scene.background = gltf
    }, [gltf])
     
    return null
})
export default SceneBackground;