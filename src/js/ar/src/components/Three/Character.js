import React, {useMemo, useRef, useEffect} from 'react'
import {connect} from 'react-redux'

import {getSceneObjects, getSelections} from "../../../../shared/reducers/shot-generator"

import {useAsset} from "../../../../shot-generator/hooks/use-assets-manager"
import {patchMaterial} from "../../../../shot-generator/helpers/outlineMaterial"


import getFilepathForModelByType from "../../../../xr/src/helpers/get-filepath-for-model-by-type"
import cloneGltf from "../../../../shot-generator/helpers/cloneGltf"
import isUserModel from "../../../../shot-generator/helpers/isUserModel"

import * as BonesHelper from "../../../../xr/src/three/BonesHelper"
import * as IKHelper from "../../../../shared/IK/IkHelper"

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

const Character = ({sceneObject, path, modelSettings, isSelected}) => {
  const {asset: gltf} = useAsset(path)

  const ref = useRef(null)
  useEffect(() => {
    return () => {
      ref.current.remove(BonesHelper.getInstance())
      ref.current.remove(IKHelper.getInstance())
    }
  }, [gltf])

  const [skeleton, lod, originalSkeleton, armature, originalHeight] = useMemo(() => {
    if(!gltf) {
      return [null, null, null, null, null]
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

  // Applies skeleton changes
  // Initial skeleton pose is skeleton hand near waist
  // We need to modify/apply this pose before changing skeleton in store
  useMemo(() => {
    if (!skeleton) return
    // has the user entered data for at least one bone?
    let hasModifications = Object.values(sceneObject.skeleton).length > 0

    if (hasModifications) {
      // go through all the bones in the skeleton
      for (let bone of skeleton.bones) {
        // if user data exists for a bone, use it
        let modified = sceneObject.skeleton[bone.name]
        // otherwise, use our original skeleton for reference
        let original = originalSkeleton.getBoneByName(bone.name)

        // call this state
        let state = modified || original
        // if the state differs for this bone
        if (bone.rotation.equals(state.rotation) == false) {
          // rotate the bone
          bone.rotation.setFromVector3(state.rotation)
          // and update
          bone.updateMatrixWorld()
        }

      }
    } else {
      // reset the pose
      skeleton.pose()
    }
  }, [skeleton, sceneObject.skeleton])

  // Applies hand skeleton changes
  useMemo(() => {
    if (!skeleton) return
    if (!sceneObject.handSkeleton) return
    let hasModifications = Object.values(sceneObject.handSkeleton).length > 0

    if (hasModifications) {
      let handSkeletonKeys = Object.keys(sceneObject.handSkeleton)
      let skeletonBones = skeleton.bones.filter(bone => handSkeletonKeys.includes(bone.name))
      for ( let i = 0; i < skeletonBones.length; i++ ) {
        let key = skeletonBones[i].name
        let bone = skeletonBones[i]
        let handBone = sceneObject.handSkeleton[key]
        bone.rotation.x = handBone.rotation.x
        bone.rotation.y = handBone.rotation.y
        bone.rotation.z = handBone.rotation.z
      }
    }
  }, [skeleton, sceneObject.skeleton, sceneObject.handSkeleton])

  // headScale (0.8...1.2)
  useEffect(() => {
    if(!skeleton) return
    let headBone = skeleton.getBoneByName('Head')
    if (headBone) {
      // in prior versions, the head was scaled proportionally to the body
      // before applying the user's percentage adjustment
      //
      // now we just use the user's percentage value directly
      headBone.scale.setScalar(sceneObject.headScale)
    }
  }, [skeleton, sceneObject.headScale])

  useEffect(() => {
    if(!lod) return
    lod.children.forEach(skinnedMesh => {
      skinnedMesh.material.emissive.set(sceneObject.tintColor)
    })
  }, [sceneObject.tintColor])

  useEffect(() => {
    if(!lod) return
    if (modelSettings && modelSettings.validMorphTargets && modelSettings.validMorphTargets.length) {
      lod.children.forEach(skinnedMesh => {
        skinnedMesh.material.morphTargets = skinnedMesh.material.morphNormals = true
        modelSettings.validMorphTargets.forEach((name, index) => {
          skinnedMesh.morphTargetInfluences[index] = sceneObject.morphTargets[name]
        })
      })
    } else {
      lod.children.forEach(skinnedMesh => {
        skinnedMesh.material.morphTargets = skinnedMesh.material.morphNormals = false
      })
    }
  }, [modelSettings, sceneObject.morphTargets])

  // Selects character when character's model has been changed it reselects new character
  useEffect(() => {
    if(!ref.current || !lod || !ref.current.children.length) return

    if (isSelected) {
      BonesHelper.getInstance().initialize(lod.children[0])
      if(!isUserModel(sceneObject.model) && !IKHelper.getInstance().isIkDisabled) {
        IKHelper.getInstance().initialize(lod.children[0], originalHeight)
        ref.current.add(IKHelper.getInstance())
      }
      ref.current.add(BonesHelper.getInstance())
    } else {
      ref.current.remove(BonesHelper.getInstance())
      ref.current.remove(IKHelper.getInstance())

    }
  }, [lod, isSelected])

  if (!lod) {
    return null
  }


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
        type: 'character',
        id: sceneObject.id,
        locked
      }}

      ref={ref}
    >
      <primitive object={lod}/>
      <primitive object={armature}/>
    </group>
  )
}

const mapStateToProps = (state, ownProps) => {
  const sceneObject = getSceneObjects(state)[ownProps.id]
  const path = getFilepathForModelByType(sceneObject)

  const isSelected = getSelections(state).indexOf(ownProps.id) !== -1
  const modelSettings = state.models[sceneObject.model] || undefined
  
  return {
    sceneObject,
    isSelected,
    modelSettings,
    path
  }
}

export default connect(mapStateToProps)(Character)
