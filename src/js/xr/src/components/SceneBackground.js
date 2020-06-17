import React, { useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { useThree } from 'react-three-fiber'


const SceneBackground = React.memo(({ texture, world }) => {
    const { scene, camera, gl } = useThree()
    const intersectionBox = useRef()
    const intersectionCamera = useRef()
    
    useEffect(() => {
        let geometry = new THREE.BoxBufferGeometry(1, 1, 1)
        let material = new THREE.MeshBasicMaterial({ side: THREE.BackSide})
        intersectionBox.current = new THREE.Mesh(geometry, material)
        intersectionCamera.current = camera.clone()
        return () => {
            intersectionBox.current.geometry.dispose()
            intersectionBox.current.material.dispose()
            if(scene.background instanceof THREE.Texture) {
                scene.background.dispose()
            }
        }
    }, [])

    useEffect(() => {
        scene.background = new THREE.Color(world.backgroundColor)
    }, [world.backgroundColor])

    useMemo(() => {
        if(!texture) return
   
    }, [texture])
     
    return <group/>
})
export default SceneBackground;