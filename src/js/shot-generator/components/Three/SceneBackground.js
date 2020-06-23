import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { useThree } from 'react-three-fiber'
import { useAsset } from '../../hooks/use-assets-manager'
import CubeMapDrawingTexture from './helpers/cubeMapDrawingTexture'
import SimpleTexture from './helpers/SimpleTexture'
import CubeTextureCreator from './helpers/CubeTextureCreator'
import fs from 'fs-extra'
import path from 'path'
import SceneTextureType from '../InspectedWorld/SceneTextureType'

const SceneBackground = React.memo(({ imagePath, world, storyboarderFilePath, updateWorld, drawingSceneTexture }) => {
    const texturePath = useRef()
    const { scene, camera, gl } = useThree()
    const { asset: texture } = useAsset(!scene.userData.tempPath ? imagePath[0] : imagePath[0].includes(scene.userData.tempPath ) ? null : imagePath[0])
    const intersectionBox = useRef()
    const intersectionCamera = useRef()
    const cubeTextureCreator = useRef( new CubeTextureCreator())
    
    useEffect(() => {
        return () => {
            if(scene.background instanceof THREE.Texture) {
                scene.background.dispose()
                scene.background = null
            }
        }
    }, [])

    useEffect(() => {
        if(!imagePath[0]) {
            if(scene.background instanceof THREE.Texture) {
                scene.background.dispose()
                scene.background = new THREE.Color(world.backgroundColor)
                cleanUpTempFile()
            }
        }
    }, [imagePath[0]])

    useEffect(() => {
        if(world.textureType === SceneTextureType.CubeMap) {
            drawingSceneTexture.texture = new CubeMapDrawingTexture()
            let geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            let material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide})
            intersectionBox.current = new THREE.Mesh(geometry, material)
            intersectionCamera.current = camera.clone()
  
        } else if(world.textureType === SceneTextureType.Image) {
            drawingSceneTexture.texture = new SimpleTexture()
            let geometry = new THREE.PlaneBufferGeometry(1, 1)
            let material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide})
            intersectionBox.current = new THREE.Mesh(geometry, material)
            intersectionBox.current.position.set(0, 0, -1)
            intersectionBox.current.updateMatrixWorld(true)
            intersectionCamera.current = new THREE.OrthographicCamera(-1, 1, 1, 1, 1, 1000)
            intersectionCamera.current.add(intersectionBox.current)
        }
        return () => {
            if(intersectionBox.current) {
                intersectionBox.current.geometry.dispose()
                intersectionBox.current.material.dispose()   
            }
            intersectionCamera.current = null
            intersectionBox.current = null
        }
    }, [world.textureType])

    useEffect(() => {
        scene.background = new THREE.Color(world.backgroundColor)
    }, [world.backgroundColor])

    const draw = (mousePos, camera, drawingBrush) => {
        if(world.textureType === SceneTextureType.CubeMap)  {
            drawingSceneTexture.texture.createMaterial(scene.background);
            intersectionCamera.current.copy(camera)
            intersectionCamera.current.position.set(0, 0, 0)
        }
        intersectionCamera.current.quaternion.copy(camera.worldQuaternion())
        intersectionCamera.current.updateMatrixWorld(true)

        drawingSceneTexture.texture.draw(mousePos, intersectionBox.current, intersectionCamera.current, drawingBrush)
    }

    const cleanUpTempFile = () => {
        if(scene.userData.tempPath) {
            let tempFile = path.join(path.dirname(storyboarderFilePath), 'models/sceneTextures/', scene.userData.tempPath)
            fs.remove(tempFile)
            scene.userData.tempPath = null
        }
    }
    
    const save = () => {
        cleanUpTempFile()
        let tempFileName = `temp_scenetexture-${Date.now()}.jpg`
        if(world.textureType === SceneTextureType.CubeMap)  {
            cubeTextureCreator.current.saveCubeMapTexture(imagePath[0], scene.background, tempFileName) 
        } else if(world.textureType === SceneTextureType.Image) {
            let imageData = drawingSceneTexture.texture.getImage("image/jpg")
            let imageFilePath = path.join(path.dirname(storyboarderFilePath), 'models/sceneTextures', tempFileName)
            fs.writeFileSync(imageFilePath, imageData, 'base64')
        }
        updateWorld({sceneTexture: 'models/sceneTextures/' + tempFileName})
        scene.userData.tempPath = tempFileName
        texturePath.current = tempFileName
    }

    useEffect(() => {
        if(!texture ) return
        cleanUpTempFile()
        let backgroundTexture 
        if(world.textureType === SceneTextureType.CubeMap)  {
            backgroundTexture = cubeTextureCreator.current.getCubeMapTexture(texture, storyboarderFilePath);
            if(backgroundTexture) {
                drawingSceneTexture.save = save
            } else {
                updateWorld({ sceneTexture: null, textureType: null })
                return
            }
        } else if(world.textureType === SceneTextureType.Image) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
            texture.offset.set(0, 0)
            texture.repeat.set(1, 1)
            const { width, height } = texture.image
            let aspect = width / height
            intersectionCamera.current.left = 1 * aspect / -2
            intersectionCamera.current.right = 1 * aspect / 2
            intersectionCamera.current.top = 1 /2
            intersectionCamera.current.bottom = 1 / -2
            intersectionCamera.current.updateProjectionMatrix()
            intersectionBox.current.scale.set(1 * aspect, 1, 1)
            intersectionBox.current.updateMatrixWorld(true)
            backgroundTexture = drawingSceneTexture.texture.createMaterial({map: texture}).map
            drawingSceneTexture.texture.setTexture(texture)
            drawingSceneTexture.save = save
        }
        scene.userData.texturePath = imagePath[0]
        scene.background = backgroundTexture;
        drawingSceneTexture.draw = draw
    }, [texture])

     
    return null
})
export default SceneBackground;