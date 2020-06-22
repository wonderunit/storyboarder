import React, {useMemo} from 'react'
import {connect} from 'react-redux'

import {getSceneObjects} from "../../../../shared/reducers/shot-generator"

import {useAsset} from "../../../../shot-generator/hooks/use-assets-manager"
import {patchMaterial} from "../../../../shot-generator/helpers/outlineMaterial"


import getFilepathForModelByType from "../../../../xr/src/helpers/get-filepath-for-model-by-type"
import cloneGltf from "../../../../shot-generator/helpers/cloneGltf"
import isUserModel from "../../../../shot-generator/helpers/isUserModel"

const materialFactory = () => patchMaterial(new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  specular: 0x0,
  skinning: true,
  shininess: 0,
  flatShading: false,
  morphNormals: true,
  morphTargets: true
}))

const Character = ({sceneObject, path}) => {
  const {asset: gltf} = useAsset(path)

  const [skeleton, lod, originalSkeleton, armature, originalHeight] = useMemo(() => {
    if(!gltf) {
      return [null, new THREE.Group(), null, new THREE.Group(), 1]
    }

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

    for (let i = startAt, d = 0; i < meshes.length; i++, d++) {
      let mesh = meshes[i]
      mesh.matrixAutoUpdate = false
      map = mesh.material.map

      mesh.material = materialFactory()
      mesh.material.map = map
      
      lod.addLevel(mesh, d * 4)
    }

    let skeleton = lod.children[0].skeleton
    skeleton.pose()

    let originalSkeleton = skeleton.clone()
    originalSkeleton.bones = originalSkeleton.bones.map(bone => bone.clone())

    let armature = scene.getObjectByProperty("type", "Bone").parent
    let originalHeight
    if (isUserModel(sceneObject.model)) {
      originalHeight = 1
    } else {
      let bbox = new THREE.Box3().setFromObject(lod)
      originalHeight = bbox.max.y - bbox.min.y
    }
    
    return [skeleton, lod, originalSkeleton, armature, originalHeight]
  }, [gltf])

  const bodyScale = sceneObject.height / originalHeight

  const { x, y, z, rotation, visible, locked } = sceneObject
  
  return (
    <group
      visible={visible}

      position={ [x, z, y] }
      rotation={ [0, rotation, 0] }
      scale={ [bodyScale, bodyScale, bodyScale] }

      userData={{
        isSelectable: true,
        id: sceneObject.id,
        locked
      }}
    >
      <primitive object={lod}/>
      <primitive object={armature}/>
    </group>
  )
}

const mapStateToProps = (state, ownProps) => {
  const sceneObject = getSceneObjects(state)[ownProps.id]
  const path = getFilepathForModelByType(sceneObject)
  
  return {
    sceneObject,
    path
  }
}

export default connect(mapStateToProps)(Character)
