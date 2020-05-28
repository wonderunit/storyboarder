import React, { useMemo, useState, useEffect } from 'react'
import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, IMAGE_HEIGHT, IMAGE_WIDTH } from '../../../utils/InspectorElementsSettings'
import Image from '../../Image'
import classNames from 'classnames'
import path from 'path'
import fs from 'fs-extra'
import ThumbnailRenderer from '../../../utils/ThumbnailRenderer'
import { remote } from 'electron'
import cloneGltf from '../../../helpers/cloneGltf'
import {patchMaterial} from '../../../helpers/outlineMaterial'
import getMidpoint from '../../Three/Helpers/midpoint'
import { useAsset } from '../../../hooks/use-assets-manager'
import isUserModel from '../../../helpers/isUserModel'
import clampInstance from '../../../utils/clampInstance'
import RemovableItem from '../RemovableItem/RemovableItem'
import defaultEmotions from '../../../../shared/reducers/shot-generator-presets/emotions.json'
let defaultArray = Object.values(defaultEmotions)
const isDefaultPreset = (id) => {
  return defaultArray.find(image => image.id === id)
} 
const createCharacter = (gltf) => {
    let lod = new THREE.LOD()
    let { scene } = cloneGltf(gltf)
    let map
  
    // for built-in Characters
    // SkinnedMeshes are immediate children
    let meshes = scene.children.filter(child => child.isSkinnedMesh)
  
    // if no SkinnedMeshes are found there, this may be a custom model file
    if (meshes.length === 0 && scene.children.length && scene.children[0].children) {
          // try to find the first SkinnedMesh in the first child object's children
          let mesh = scene.children[0].children.find(child => child.isSkinnedMesh)
          if (mesh) {
            meshes = [mesh]
          }
    }
  
    // if there's only 1 mesh
    let startAt = meshes.length == 1
      // start at mesh index 0 (for custom characters)
      ? 0
      // otherwise start at mesh index 1 (for built-in characters)
      : 1
  
    for (let i = startAt, d = 0; i < startAt+1; i++, d++) {
          let mesh = meshes[i]
          mesh.matrixAutoUpdate = false
          map = mesh.material.map
  
          mesh.material = new THREE.MeshToonMaterial({
            map: map,
            color: 0xffffff,
            emissive: 0x0,
            specular: 0x0,
            skinning: true,
            shininess: 0,
            flatShading: false,
            morphNormals: true,
            morphTargets: true
          })
  
          patchMaterial(mesh.material)
          
          lod.addLevel(mesh, d * 4)
    }
  
    let skeleton = lod.children[0].skeleton
    skeleton.pose()
  
    let originalSkeleton = skeleton.clone()
    originalSkeleton.bones = originalSkeleton.bones.map(bone => bone.clone())
  
    let armature = scene.getObjectByProperty("type", "Bone").parent
    let character = new THREE.Group()
    character.add(lod)
    character.add(armature)
    return character
}
  
const setupRenderer = ({ thumbnailRenderer, attachment, data, texture, faceMesh }) => {
    if (!thumbnailRenderer.getGroup().children.length) {
      let modelData = attachment
      let group = createCharacter(modelData)
  
      thumbnailRenderer.getGroup().add(group)
      group.rotation.y = Math.PI/22
      let mesh = thumbnailRenderer.getGroup().getObjectByProperty("type", "SkinnedMesh")
      faceMesh.setSkinnedMesh(mesh)
    }
    // setup thumbnail renderer
    faceMesh.draw(texture)
}

const EmotionInspectorItem = React.memo(({ id, style, onSelectItem, data, attachment, thumbnailRenderer, textureLoader, faceMesh, selectedSrc, storyboarderFilePath, showRemoval, onRemoval}) => {
    const imagePath = useMemo(() => {
      let imagePath 
      if(!isUserModel(data.filename)) { 
        imagePath = path.join(window.__dirname, 'data', 'shot-generator', 'emotions', `${data.filename}.png`)
      } else {
        imagePath = path.join(path.dirname(storyboarderFilePath), data.filename)
      }
      return imagePath
    }, [])
    const src = path.join(remote.app.getPath('userData'), 'presets', 'emotions', `${data.id}.jpg`)
    const [isLoaded, setLoaded] = useState(fs.existsSync(src))
    const {asset:texture} = useAsset( isLoaded ? "" : imagePath)
    const [show, setShow] = useState(false)

    useEffect(()=> {
      if(!isDefaultPreset(data.id)) {
        setShow(showRemoval)
      }
    }, [showRemoval])
    
    useMemo(() => {
        let hasRendered = isLoaded
    
        if (!hasRendered && texture) {
            thumbnailRenderer.current = thumbnailRenderer.current || new ThumbnailRenderer()
            setupRenderer({
              thumbnailRenderer: thumbnailRenderer.current,
              attachment,
              data,
              texture,
              faceMesh:faceMesh.current
            })
            let character = thumbnailRenderer.current.getGroup().getObjectByProperty("type", "SkinnedMesh")
            let camera = thumbnailRenderer.current.camera
            let boxGeometry = new THREE.BoxGeometry(2.5, 2)
            let headBone = character.skeleton.getBoneByName("Head").worldPosition()
            let leftEye = character.skeleton.getBoneByName("LeftEye").worldPosition()
            let rightEye = character.skeleton.getBoneByName("RightEye").worldPosition()
            let material = new THREE.MeshBasicMaterial()
            let mesh = new THREE.Mesh(boxGeometry, material);
            let midPoint = getMidpoint(headBone, leftEye, rightEye)
            mesh.scale.multiplyScalar(0.15 / character.scale.x)
            mesh.position.copy(midPoint)
            mesh.updateWorldMatrix(true, true)
            clampInstance(mesh, camera, new THREE.Vector3(0, 0, 1))
            mesh.visible = false;
            thumbnailRenderer.current.render()
            let dataURL = thumbnailRenderer.current.toDataURL('image/jpg')
            thumbnailRenderer.current.clear()
        
            fs.ensureDirSync(path.dirname(src))
        
            fs.writeFileSync(
              src,
              dataURL.replace(/^data:image\/\w+;base64,/, ''),
              'base64'
            )
            setLoaded(true)
        }
    }, [src, texture])

    let className = classNames("thumbnail-search__item", {
        "thumbnail-search__item--selected": selectedSrc === data.filename
    })
    const onPointerDown = () => {
        onSelectItem(data.filename)
    }
    return <RemovableItem 
            className={ className } 
            style={ style }
            onPointerUp={ onPointerDown }
            title={ data.name }
            onRemoval= { onRemoval}
            show={ show }
            data={ data }> 
                <div style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}>
                    { isLoaded && <Image src={ src } className="thumbnail"/>}
                </div>
                <div className="thumbnail-search__name"
                  style={{
                    width: ITEM_WIDTH ,
                    height: ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE
                  }}>
                { data.name }
              </div>
            </RemovableItem>
})

export default EmotionInspectorItem;