import React, {useMemo} from 'react'
import {connect} from 'react-redux'

import {getSceneObjects} from "../../../../shared/reducers/shot-generator"

import {useAsset} from "../../../../shot-generator/hooks/use-assets-manager"
import useGLTFAsset from "../../hooks/useGLTFAsset"
import {patchMaterial} from "../../../../shot-generator/helpers/outlineMaterial"


import RoundedBoxGeometryCreator from "../../../../vendor/three-rounded-box"
import getFilepathForModelByType from "../../../../xr/src/helpers/get-filepath-for-model-by-type"
const RoundedBoxGeometry = RoundedBoxGeometryCreator(THREE)

const materialFactory = () => patchMaterial(new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  skinning: false,
  shininess: 0,
  flatShading: false,
  morphNormals: false,
  morphTargets: false
}))

const Model = ({sceneObject, path}) => {
  const {asset} = useAsset((sceneObject.model === 'box') ? null : path)
  let object = useGLTFAsset(asset ? asset.scene : null)
  
  object = useMemo(() => {
    if (sceneObject.model !== 'box') {
      return object
    }
    
    let geometry = new RoundedBoxGeometry(1, 1, 1, 0.005, 5)
    geometry.translate(0, 0.5, 0)
    
    let material = materialFactory()
    
    return new THREE.Mesh(geometry, material)
  }, [object, sceneObject.model])

  const { x, y, z, visible, width, height, depth, rotation, locked } = sceneObject
  
  return (
    <primitive
      object={object}
      
      visible={visible}

      position={[x, y, z]}
      scale={[width, height, depth]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    />
  )
}

const mapStateToProps = (state, ownProps) => {
  const sceneObject = getSceneObjects(state)[ownProps.id]
  const path = (sceneObject.model === 'box') 
    ? null 
    : getFilepathForModelByType({
      type: 'object',
      model: sceneObject.model
    })
  
  return {
    sceneObject,
    path
  }
}
  


export default connect(mapStateToProps)(Model)
