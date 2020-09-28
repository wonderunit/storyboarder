import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { useThree } from 'react-three-fiber'
import { useAsset } from '../../hooks/use-assets-manager'
import CubeTextureCreator from './helpers/CubeTextureCreator'
import fs from 'fs-extra'
import path from 'path'
import DrawingTextureType from '../InspectedWorld/DrawingTextureType'
import { saveDataURLtoFile } from '../../helpers/saveDataURLtoFile'
import { TextureObjectType } from './Helpers/DrawingTextureContainer'
const SceneBackground = React.memo(({ imagePath, world, storyboarderFilePath, updateWorld, drawingTextures }) => {
    const texturePath = useRef()
    const { scene, camera, gl } = useThree()
    const { asset: texture } = useAsset( !imagePath[0] || !scene.userData.tempPath ? imagePath[0] : imagePath[0].includes(scene.userData.tempPath ) ? null : imagePath[0])
    const intersectionBox = useRef()
    const intersectionCamera = useRef()
    const cubeTextureCreator = useRef( new CubeTextureCreator())
    const id = useRef()
    
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


    const draw = (mousePos, camera, drawingBrush) => {
        let textureObject = drawingTextures.getTextureById(id.current)
        if(world.textureType === DrawingTextureType.Cubemap)  {
            textureObject.texture.createMaterial(scene.background);
            intersectionCamera.current.copy(camera)
            intersectionCamera.current.position.set(0, 0, 0)
        }
        intersectionCamera.current.quaternion.copy(camera.worldQuaternion())
        intersectionCamera.current.updateMatrixWorld(true)

        textureObject.texture.draw(mousePos, intersectionBox.current, intersectionCamera.current, drawingBrush)
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
        if(world.textureType === DrawingTextureType.Cubemap)  {
            let dataUrl = cubeTextureCreator.current.combineImages(scene.background) 
            let {dir, ext, name} = path.parse(imagePath[0]);
            let properName = tempFileName ? tempFileName : name + ext; 
            saveDataURLtoFile(dataUrl, `${properName}`, 'models/sceneTextures', storyboarderFilePath);
        } else if(world.textureType === DrawingTextureType.Simple) {
            let imageData = drawingTextures.getTextureById(id.current).texture.getImage('image/jpg').replace(/^data:image\/\w+;base64,/, '')
            let dirpath = path.join(path.dirname(storyboarderFilePath), 'models', 'sceneTextures')
            let imageFilePath = path.join(dirpath, tempFileName)
            fs.ensureDirSync(dirpath)
            fs.writeFileSync(imageFilePath, imageData, 'base64')
        }
        updateWorld({sceneTexture: path.join('models', 'sceneTextures', tempFileName) })
        scene.userData.tempPath = tempFileName
        texturePath.current = tempFileName
    }


    useEffect(() => {
        id.current = THREE.MathUtils.generateUUID() 
        if(world.textureType === DrawingTextureType.Cubemap) {
            drawingTextures.createTexture(id.current, DrawingTextureType.Cubemap, TextureObjectType.Background, save, draw)
            let geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            let material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide})
            intersectionBox.current = new THREE.Mesh(geometry, material)
            intersectionCamera.current = camera.clone()
  
        } else if(world.textureType === DrawingTextureType.Simple) {
            drawingTextures.createTexture(id.current, DrawingTextureType.Simple, TextureObjectType.Background, save, draw)
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
            drawingTextures.removeTexture(id.current)
            intersectionCamera.current = null
            intersectionBox.current = null
        }
    }, [world.textureType])

    useEffect(() => {
        scene.background = new THREE.Color(world.backgroundColor)
    }, [world.backgroundColor])

    useEffect(() => {
        if(!texture ) return
        cleanUpTempFile()
        let backgroundTexture 
        let textureObject = drawingTextures.getTextureById(id.current)
        if(world.textureType === DrawingTextureType.Cubemap)  {
            backgroundTexture = cubeTextureCreator.current.getCubeMapTexture(texture, storyboarderFilePath);
            if(backgroundTexture) {
                textureObject.save = () => save()
            } else {
                updateWorld({ sceneTexture: null, textureType: null })
                return
            }
        } else if(world.textureType === DrawingTextureType.Simple) {
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
            backgroundTexture = textureObject.texture.createMaterial({map: texture}).map
            textureObject.texture.setTexture(texture)
            textureObject.save = () => save()
        }
        scene.userData.texturePath = world.sceneTexture
        scene.background = backgroundTexture;
        textureObject.draw = (...args) => draw(...args)
    }, [texture])

     
    return null
})
export default SceneBackground;