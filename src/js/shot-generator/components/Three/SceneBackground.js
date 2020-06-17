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

const SceneBackground = React.memo(({ imagePath, world, storyboarderFilePath, updateWorld, drawTextures }) => {
    const { asset: gltf } = useAsset(imagePath[0])
    const { scene, camera, gl } = useThree()
    const intersectionBox = useRef()
    const intersectionCamera = useRef()
    
    useEffect(() => {
        drawTextures["scenetexture"] = { texture: new CubeMapDrawingTexture(), draw: draw }
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


    const draw = (mousePos, drawingMesh) => {
        drawTextures["scenetexture"].texture.createMaterial(scene.background);
        intersectionCamera.current.copy(camera)
        intersectionCamera.current.position.set(0, 0, 0)
        intersectionCamera.current.quaternion.copy(camera.worldQuaternion())
        intersectionCamera.current.updateMatrixWorld(true)
        drawTextures["scenetexture"].texture.draw(mousePos, intersectionBox.current, intersectionCamera.current, drawingMesh)
        cubeTextureCreator.saveCubeMapTexture(imagePath[0], scene.background)
    }

    useMemo(() => {
        if(!gltf) return
        let cubeTexture;
        if(gltf instanceof THREE.Texture) {
            cubeTexture = cubeTextureCreator.getCubeMapTexture(gltf, storyboarderFilePath);
        }

        if(cubeTexture) {
            scene.background = cubeTexture;
            drawTextures["scenetexture"].draw = draw
        } else {
            if(scene.background instanceof THREE.CubeTexture) {
                scene.background.dispose();
                gltf.dispose();
                scene.background = null;
            }
            updateWorld({scenetexture:null});
        }
    }, [gltf])

     
    return null
})
export default SceneBackground;