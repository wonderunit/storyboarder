import React, {useMemo, useState} from 'react'
import {connect} from 'react-redux'

import {getSceneObjects} from "../../../../shared/reducers/shot-generator"

import {useAsset} from "../../../../shot-generator/hooks/use-assets-manager"


import RoundedBoxGeometryCreator from "../../../../vendor/three-rounded-box"
import getFilePathForImage from "../../../../xr/src/helpers/get-filepath-for-image"
const RoundedBoxGeometry = RoundedBoxGeometryCreator(THREE)

const Image = ({sceneObject, path}) => {
  const {asset: texture} = useAsset(path || null)
  const [aspect, setAspect] = useState(1.0)

  const material = useMemo(() => {
    return new THREE.MeshToonMaterial({ transparent: true })
  }, [])

  useMemo(() => {
    if(!texture) return

    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.offset.set(0, 0)
    texture.repeat.set(1, 1)

    const { width, height } = texture.image
    setAspect(width / height)

    if (material) {
      material.map = texture
      material.needsUpdate = true
    }
  }, [setAspect, material, texture, path])

  let imageObject = useMemo(() => {
    let geometry = new RoundedBoxGeometry(1, 1, 0.01, 0.01)
    geometry.translate(0, 0.5, 0)

    return new THREE.Mesh(geometry, material)
  }, [material])

  const { x, y, z, visible, height, rotation, locked } = sceneObject
  
  return (
    <primitive
      object={imageObject}
      
      visible={visible}

      position={[x, z, y]}
      scale={[height * aspect, height, 1]}
      rotation={[rotation.x, rotation.y, rotation.z]}

      userData={{
        isSelectable: true,
        id: sceneObject.id,
        locked
      }}
    />
  )
}

const mapStateToProps = (state, ownProps) => {
  const sceneObject = getSceneObjects(state)[ownProps.id]
  const path = getFilePathForImage(sceneObject)
  
  return {
    sceneObject,
    path
  }
}
  


export default connect(mapStateToProps)(Image)
