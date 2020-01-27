import React, { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useUpdate, useThree } from 'react-three-fiber'
import cloneGltf from '../../helpers/cloneGltf'
import SGIkHelper from '../../../shared/IK/SGIkHelper'
import BonesHelper from '../../../xr/src/three/BonesHelper'
import ObjectRotationControl from '../../../shared/IK/objects/ObjectRotationControl'
const isUserModel = model => !!model.match(/\//)

const Character = React.memo(({ gltf, sceneObject, modelSettings, isSelected, selectedBone, updateCharacterSkeleton }) => {
    const ref = useRef()
    const [ready, setReady] = useState(false)
    const attachablesList = useRef([])
    const { scene, camera, gl } = useThree()
    const objectRotationControl = useRef(null)
    const [skeleton, lod, originalSkeleton, armature, originalHeight] = useMemo(
        () => {
          if(!gltf) {
            setReady(false)
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
    
            mesh.material = new THREE.MeshToonMaterial({
              map: map,
              color: 0xffffff,
              emissive: 0x0,
              specular: 0x0,
              reflectivity: 0x0,
              skinning: true,
              shininess: 0,
              flatShading: false,
              morphNormals: true,
              morphTargets: true
            })
            lod.addLevel(mesh, d * 4)
          }
    
          let skeleton = lod.children[0].skeleton
          skeleton.pose()
    
          let originalSkeleton = skeleton.clone()
          originalSkeleton.bones = originalSkeleton.bones.map(bone => bone.clone())
    
          let armature = scene.children[0].children[0]
    
          let originalHeight
          if (isUserModel(sceneObject.model)) {
            originalHeight = 1
          } else {
            let bbox = new THREE.Box3().setFromObject(lod)
            originalHeight = bbox.max.y - bbox.min.y
          }
          // We need to override skeleton when model is changed because in store skeleton position is still has values for prevModel
          setReady(true)
          return [skeleton, lod, originalSkeleton, armature, originalHeight]
        },
        [gltf]
      )

    useMemo(() => {
      if (!skeleton) return
      // has the user entered data for at least one bone?
      let hasModifications = Object.values(sceneObject.skeleton).length > 0

      if (hasModifications) {
      //  let position = new THREE.Vector3()
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
    }, [skeleton, sceneObject.skeleton, ready])
    
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
    }, [skeleton, sceneObject.skeleton, sceneObject.handSkeleton, ready])

    const bodyScale = useMemo(
      () => sceneObject.height / originalHeight,
      [sceneObject.height, ready]
    )

    useMemo(() => {
        if(!camera) return
        SGIkHelper.getInstance().setCamera(camera)
        if(objectRotationControl.current)
            objectRotationControl.current.setCamera(camera)
    }, [camera])

    // headScale (0.8...1.2)
    useMemo(() => {
      if(!skeleton) return
      let headBone = skeleton.getBoneByName('Head')
      if (headBone) {
        // in prior versions, the head was scaled proportionally to the body
        // before applying the user's percentage adjustment
        //
        // now we just use the user's percentage value directly
        headBone.scale.setScalar(sceneObject.headScale)
      }
    }, [skeleton, sceneObject.headScale, ready])

    useMemo(() => {
      if(!lod) return
      lod.children.forEach(skinnedMesh => {
        skinnedMesh.material.emissive.set(sceneObject.tintColor)
      })
    }, [sceneObject.tintColor, ready])

    useMemo(() => {
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
    }, [modelSettings, sceneObject.morphTargets, ready])

    useEffect(() => {
        if(!objectRotationControl.current) return
        if(!skeleton) return
        // if there was a prior selected bone
        if (BonesHelper.getInstance().selectedBone) {
            BonesHelper.getInstance().resetSelection()
        }
        // was a bone selected?
        if (selectedBone) {
            // find the 3D Bone matching the selectedBone uuid
            let bone = skeleton.bones.find(object => object.uuid === selectedBone) 
              
            if (bone) {
              BonesHelper.getInstance().selectBone(bone)
              objectRotationControl.current.selectObject(bone, selectedBone)
            }
        }
        else {
            objectRotationControl.current.deselectObject()
        }
    }, [selectedBone])

    useMemo(() => {
      if(!ref.current) return
      if (isSelected) {

        BonesHelper.getInstance().initialize(lod.children[0])
        if(!isUserModel(sceneObject.model) && !SGIkHelper.getInstance().isIkDisabled) {
            SGIkHelper.getInstance().initialize(ref.current, modelSettings.height, lod.children[0], sceneObject)
            ref.current.add(SGIkHelper.getInstance())
        }
        ref.current.add(BonesHelper.getInstance())
      } else {
        ref.current.remove(BonesHelper.getInstance())
        ref.current.remove(SGIkHelper.getInstance())
        
      }
    }, [ref.current, isSelected, ready])

    useMemo(() => {
        if(!ref.current) return 
        objectRotationControl.current = new ObjectRotationControl(scene.children[0], camera, gl.domElement, ref.current.uuid)
        objectRotationControl.current.setUpdateCharacter((name, rotation) => { updateCharacterSkeleton({
          id: sceneObject.id,
          name : name,
          rotation:
          {
            x : rotation.x,
            y : rotation.y,
            z : rotation.z,
          }
        } ) })
    }, [ref.current])

    return <group
        ref={ref}

        onController={sceneObject.visible ? () => null : null}
        userData={{
          type: 'character',
          id: sceneObject.id,
          poleTargets: sceneObject.poleTargets || {}
        }}

        position={[sceneObject.x, sceneObject.z, sceneObject.y]}
        rotation={[0, sceneObject.rotation, 0]}
        scale={[bodyScale, bodyScale, bodyScale]}
      >
        <primitive object={lod ? lod : new THREE.Object3D() } />
        <primitive object={armature ? armature : new THREE.Object3D()} />
      </group>
})

export default Character
