import fs from 'fs-extra'
import path from 'path'
import { remote } from 'electron'
import classNames from 'classnames'
import ThumbnailRenderer from '../../../../utils/ThumbnailRenderer'
import React, { useMemo } from 'react'
import { createdMirroredHand, applyChangesToSkeleton, getOppositeHandName } from '../../../../../utils/handSkeletonUtils'
import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, IMAGE_HEIGHT, IMAGE_WIDTH } from '../../../../utils/InspectorElementsSettings'
import { getSceneObjects } from '../../../../../shared/reducers/shot-generator'
import clampInstance from '../../../../utils/clampInstance'

const setupRenderer = ({ thumbnailRenderer, attachment, preset, selectedHand }) => {
    if (!thumbnailRenderer.getGroup().children.length) {
      let modelData = attachment
  
      let group = THREE.SkeletonUtils.clone(modelData.scene.children[0])
      let child = group.children[1]
  
      let material = new THREE.MeshToonMaterial({
        color: 0xffffff,
        emissive: 0x0,
        specular: 0x0,
        skinning: true,
        shininess: 0,
        flatShading: false,
        morphNormals: true,
        morphTargets: true,
        map: modelData.scene.children[0].children[1].material.map
      })
      material.map.needsUpdate = true
  
      child.material = material
      thumbnailRenderer.getGroup().add(group)
      group.rotation.y = Math.PI/20
  
    }
  
    // setup thumbnail renderer
    let mesh = thumbnailRenderer.getGroup().children[0].children[1]
    let pose = preset.state.handSkeleton
    let skeleton = mesh.skeleton
    skeleton.pose()
    for (let name in pose) {
      let bone = skeleton.getBoneByName(name)
      if (bone) {
        bone.rotation.x = pose[name].rotation.x
        bone.rotation.y = pose[name].rotation.y
        bone.rotation.z = pose[name].rotation.z
        bone.updateMatrixWorld(true)
      }
    }
    let euler = new THREE.Euler(0, 200 * THREE.Math.DEG2RAD, 0)
    let bone = skeleton.getBoneByName(selectedHand)
    bone.updateMatrixWorld(true)
    bone.parent.parent.parent.quaternion.setFromEuler(euler)
    bone.parent.parent.quaternion.set(0, 0, 0, 1)
    bone.parent.quaternion.set(0, 0, 0, 1)
    bone.quaternion.set(0, 0, 0, 1)
  
    bone.parent.parent.parent.updateWorldMatrix(true, true)
}
  
const HandPresetsEditorItem = React.memo(({ style, id, handPosePresetId, data : preset, updateObject, attachment, thumbnailRenderer, withState, selectedHand }) => {
    const src = path.join(remote.app.getPath('userData'), 'presets', 'handPoses', `${preset.id}.jpg`)
    const onPointerDown = event => {
      event.preventDefault()
      let currentSkeleton = null
      withState((dispatch, state) => {
        currentSkeleton = getSceneObjects(state)[id].handSkeleton || {}
      })
      let handPosePresetId = preset.id
      let handSkeleton = preset.state.handSkeleton
      let skeletonBones = Object.keys(handSkeleton)      
      let currentSkeletonBones = Object.keys(currentSkeleton)      
      if(skeletonBones.length !== 0) {
        let presetHand = skeletonBones[0].includes("RightHand") ? "RightHand" : "LeftHand"
        let oppositeSkeleton = createdMirroredHand(handSkeleton, presetHand)
        if (selectedHand === "BothHands") {
          handSkeleton = Object.assign(oppositeSkeleton, handSkeleton)
        } 
        else if (selectedHand !== presetHand) {
          if(currentSkeletonBones.some(bone => bone.includes(presetHand))) {
            handSkeleton = applyChangesToSkeleton(currentSkeleton, oppositeSkeleton)
          }
          else {
              handSkeleton = oppositeSkeleton
          }
        }
        else {
          if(currentSkeletonBones.some(bone => bone.includes(getOppositeHandName(presetHand)))) {
            handSkeleton = applyChangesToSkeleton(currentSkeleton, handSkeleton)
          }
        }
      }
      updateObject(id, { handPosePresetId, handSkeleton })
    }
  
    useMemo(() => {
      let hasRendered = fs.existsSync(src)
  
      if (!hasRendered) {
        thumbnailRenderer.current = thumbnailRenderer.current || new ThumbnailRenderer()
        selectedHand = Object.keys(preset.state.handSkeleton)[0].includes("RightHand") ? "RightHand" : "LeftHand"
        setupRenderer({
          thumbnailRenderer: thumbnailRenderer.current,
          attachment,
          preset,
          selectedHand
        })
        let bone = thumbnailRenderer.current.getGroup().children[0].children[1].skeleton.getBoneByName(selectedHand)
        let camera = thumbnailRenderer.current.camera
  
        let boxGeometry = new THREE.BoxGeometry(2.5, 2)
        let material = new THREE.MeshBasicMaterial()
        let mesh = new THREE.Mesh(boxGeometry, material);
        bone.parent.add(mesh)
        mesh.scale.multiplyScalar(0.1 / thumbnailRenderer.current.getGroup().children[0].children[1].scale.x)
        mesh.position.copy(bone.position)
        mesh.position.y += 0.00095
        mesh.updateWorldMatrix(true, true)
        clampInstance(mesh, camera)
  
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
      }
    }, [src])
    let className = classNames("thumbnail-search__item", {
      "thumbnail-search__item--selected": handPosePresetId === preset.id
    })
  
    return <div className={ className }
      style={ style }
      onPointerUp={ onPointerDown }
      data-id={ preset.id }
      title={ preset.name }> 
        <figure style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}> 
          <img src={ src } style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}/>
        </figure>
        <div className="thumbnail-search__name" 
          style={{
            width: ITEM_WIDTH ,
            height: ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE
          }}>
        { preset.name }
        </div>
      </div>
})

export default HandPresetsEditorItem