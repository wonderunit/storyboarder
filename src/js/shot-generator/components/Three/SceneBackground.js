import React, { useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { useThree } from 'react-three-fiber'
import { useAsset } from '../../hooks/use-assets-manager'
import CubeMapDrawingTexture from './helpers/cubeMapDrawingTexture'
import CubeTextureCreator from './helpers/CubeTextureCreator'
const cubeTextureCreator = new CubeTextureCreator()
const mouse = (event, gl) => {
    const rect = gl.domElement.getBoundingClientRect()
    return {
      x: ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1,
      y: - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1
    }
}

const SceneBackground = React.memo(({ imagePath, world, storyboarderFilePath, updateWorld }) => {
    const { asset: gltf } = useAsset(imagePath[0])
    const { scene, camera, gl } = useThree()
    const intersectionBox = useRef()
    const intersectionCamera = useRef()
    const raycaster = useRef()
    const drawingTexture = useRef(new CubeMapDrawingTexture())
    
    useEffect(() => {
        raycaster.current = new THREE.Raycaster()
        let geometry = new THREE.BoxBufferGeometry(1, 1, 1)
        let material = new THREE.MeshBasicMaterial({ side: THREE.BackSide})
        intersectionBox.current = new THREE.Mesh(geometry, material)
        intersectionCamera.current = camera.clone()
    }, [])

    useEffect(() => {
        scene.background = new THREE.Color(world.backgroundColor)
    }, [world.backgroundColor])

    useMemo(() => {
        if(!gltf) return
        let cubeTexture
        if(gltf instanceof THREE.Texture) {
            cubeTexture = cubeTextureCreator.getCubeMapTexture(gltf, storyboarderFilePath);
        }

        if(cubeTexture) {
            scene.background = cubeTexture
        } else {
            if(scene.background instanceof THREE.CubeTexture) {
                scene.background = null
            }
            updateWorld({scenetexture:null})
        }
    }, [gltf])

    const draw = useCallback((event) => {
        intersectionCamera.current.copy(camera)
        intersectionCamera.current.position.set(0, 0, 0)
        intersectionCamera.current.quaternion.copy(camera.worldQuaternion())
        intersectionCamera.current.updateMatrixWorld(true)
        drawingTexture.current.createMaterial(scene.background)
        drawingTexture.current.draw(mouse(event, gl), intersectionBox.current, intersectionCamera.current )
        raycaster.current.setFromCamera(mouse(event, gl), intersectionCamera.current )
        cubeTextureCreator.saveCubeMapTexture(gltf, imagePath[0], scene.background, storyboarderFilePath)
    }, [gltf])

    useLayoutEffect(() => {
        if(!scene.background || !(scene.background instanceof THREE.CubeTexture)) return
        gl.domElement.addEventListener('pointerdown', draw)
        return () => {
            gl.domElement.removeEventListener('pointerdown', draw)
        }
    }, [draw])
     
    return null
})
export default SceneBackground;