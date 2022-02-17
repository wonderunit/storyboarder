import path from 'path'
import React from 'react'
import fs from 'fs-extra'
import classNames from 'classnames'
import '../../../vendor/three/examples/js/utils/SkeletonUtils'
import ThumbnailRenderer from '../../ThumbnailRenderer'
import { GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, IMAGE_HEIGHT, IMAGE_WIDTH } from '../../utils/InspectorElementsSettings'
const remote = require('@electron/remote')
import { useMemo } from 'react'

const setupRenderer = ({ thumbnailRenderer, attachment, preset }) => {
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
  let pose = preset.state.skeleton
  let skeleton = mesh.skeleton
  skeleton.pose()
  for (let name in pose) {
    let bone = skeleton.getBoneByName(name)
    if (bone) {
      bone.rotation.x = pose[name].rotation.x
      bone.rotation.y = pose[name].rotation.y
      bone.rotation.z = pose[name].rotation.z

      if (name === 'Hips') {
        bone.rotation.x += Math.PI / 2.0
      }
    }
  }
}

const PosePresetsEditorItem = React.memo(({ style, id, posePresetId, preset, updateObject, attachment, thumbnailRenderer }) => {
  const src = path.join(remote.app.getPath('userData'), 'presets', 'poses', `${preset.id}.jpg`)

  const onPointerDown = event => {
    event.preventDefault()

    let posePresetId = preset.id
    let skeleton = preset.state.skeleton

    updateObject(id, { posePresetId, skeleton })
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

  return <div className={ className }
    style={ style }
    onPointerUp={ onPointerDown }
    data-id={ preset.id }
    title={ preset.name }> 
      <figure style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}> 
        <img src={ src } style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT } }/>
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

export default PosePresetsEditorItem
