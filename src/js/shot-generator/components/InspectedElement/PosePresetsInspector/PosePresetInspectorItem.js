import path from 'path'
import React from 'react'
import fs from 'fs-extra'
import classNames from 'classnames'
import '../../../../vendor/three/examples/js/utils/SkeletonUtils'
import ThumbnailRenderer from '../../../utils/ThumbnailRenderer'
import Image from '../../Image'
import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, IMAGE_HEIGHT, IMAGE_WIDTH } from '../../../utils/InspectorElementsSettings'
const remote = require('@electron/remote')
import { useMemo } from 'react'
import cloneGltf from '../../../helpers/cloneGltf'
import {patchMaterial} from '../../../helpers/outlineMaterial'
import RemovableItem from '../RemovableItem/RemovableItem'
import defaultPosePresets from '../../../../shared/reducers/shot-generator-presets/poses.json'
let defaultArray = Object.values(defaultPosePresets)
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

const setupRenderer = ({ thumbnailRenderer, attachment, preset }) => {
  if (!thumbnailRenderer.getGroup().children.length) {
    let modelData = attachment
    let group = createCharacter(modelData)

    thumbnailRenderer.getGroup().add(group)
    group.rotation.y = Math.PI/20
  }

  // setup thumbnail renderer
  let mesh = thumbnailRenderer.getGroup().getObjectByProperty("type", "SkinnedMesh")
  let pose = preset.state.skeleton
  let skeleton = mesh.skeleton
  skeleton.pose()
  for (let name in pose) {
    let bone = skeleton.getBoneByName(name)
    if (bone) {
      bone.rotation.x = pose[name].rotation.x
      bone.rotation.y = pose[name].rotation.y
      bone.rotation.z = pose[name].rotation.z
    }
  }
}

const PosePresetsEditorItem = React.memo(({ style, id, posePresetId, data : preset, updateObject, attachment, thumbnailRenderer, undoGroupStart, undoGroupEnd, onRemoval }) => {
  const src = path.join(remote.app.getPath('userData'), 'presets', 'poses', `${preset.id}.jpg`)

  const onPointerDown = event => {
    event.preventDefault()

    let posePresetId = preset.id
    let skeleton = preset.state.skeleton
    undoGroupStart()
    updateObject(id, { posePresetId, skeleton })
    setTimeout(() => { 
      undoGroupEnd()
    }, 50)
  }

  useMemo(() => {
    let hasRendered = fs.existsSync(src)

    if (!hasRendered) {
      thumbnailRenderer.current = thumbnailRenderer.current || new ThumbnailRenderer()
      setupRenderer({
        thumbnailRenderer: thumbnailRenderer.current,
        attachment,
        preset
      })
      thumbnailRenderer.current.render()
      let dataURL = thumbnailRenderer.current.toDataURL('image/jpg')
      thumbnailRenderer.current.clear()

      fs.ensureDirSync(path.dirname(src))

      fs.writeFileSync(
        src,
        dataURL.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )
    }
  }, [src])

  let className = classNames("thumbnail-search__item", {
    "thumbnail-search__item--selected": posePresetId === preset.id
  })

  return <RemovableItem 
      className={ className } 
      style={ style }
      onPointerUp={ onPointerDown }
      title={ preset.name }
      onRemoval= { onRemoval }
      data={ preset }
      isRemovable={ !isDefaultPreset(preset.id) }> 
      <div style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}>
        <Image src={ src } className="thumbnail"/>
      </div>
      <div className="thumbnail-search__name"
        style={{
          width: ITEM_WIDTH ,
          height: ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE
        }}>
      { preset.name }
      </div>
    </RemovableItem>
})

export default PosePresetsEditorItem
