import React, { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useUpdate, useThree } from 'react-three-fiber'
import cloneGltf from '../../helpers/cloneGltf'
import SGIkHelper from '../../../shared/IK/SGIkHelper'
import BonesHelper from '../../../xr/src/three/BonesHelper'
import ObjectRotationControl from '../../../shared/IK/objects/ObjectRotationControl'
import {useAsset} from '../../hooks/use-assets-manager'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import {patchMaterial, setSelected} from '../../helpers/outlineMaterial'
import isUserModel from '../../helpers/isUserModel'

const Character = React.memo(({ path, sceneObject, modelSettings, isSelected, selectedBone, updateCharacterSkeleton, updateCharacterIkSkeleton, renderData, withState, isPreview}) => {
    const {asset: gltf} = useAsset(path)
    const ref = useUpdate(
      self => {
        let lod = self.getObjectByProperty("type", "LOD") || self
        lod && lod.traverse(child => child.layers.enable(SHOT_LAYERS))
      }
    )
    const [ready, setReady] = useState(false)
    const isFullyUpdate = useRef(false)
    const { scene, camera, gl } = useThree()
    const activeGL = useMemo(() => renderData ? renderData.gl : gl, [renderData]) 
    const objectRotationControl = useRef(null)
    useEffect(() => {
      return () => {
        ref.current.remove(SGIkHelper.getInstance())

        ref.current.remove(BonesHelper.getInstance())
        if(objectRotationControl.current)
          objectRotationControl.current.deselectObject()
      }
    }, [sceneObject.model])

    const [skeleton, lod, originalSkeleton, armature, originalHeight] = useMemo(() => {
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
              skinning: true,
              shininess: 0,
              flatShading: false,
              morphNormals: true,
              morphTargets: true
            })

            patchMaterial(mesh.material)
            
            lod.addLevel(mesh, d * 16)
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
      setReady(true)
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
    }, [skeleton, sceneObject.skeleton, ready])

    useEffect(() => {
      return () => {
        SGIkHelper.getInstance().cleanUpCharacter()
        ref.current.remove(BonesHelper.getInstance())
        ref.current.remove(SGIkHelper.getInstance())
        objectRotationControl.current.cleanUp()
        objectRotationControl.current = null
        if(!lod) return
        for(let i = 0; i < lod.children.length; i++) {
            lod.children[i].geometry.dispose()
            lod.children[i].material.dispose()
        }
      }
    }, [])

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
    }, [skeleton, sceneObject.posePresetId, sceneObject.handPosePresetId, ready])

    const bodyScale = useMemo(
      () => sceneObject.height / originalHeight,
      [sceneObject.height, lod]
    )

    useEffect(() => {
      if(!isFullyUpdate.current)
      {
        withState((dispatch, state) => {
          let type = state.lastAction.type
          if(!type.includes("UNDO") && !type.includes("REDO"))
            fullyUpdateIkSkeleton()
        })
      } else {
        isFullyUpdate.current = false
      }
    }, [sceneObject.posePresetId, sceneObject.skeleton, skeleton, sceneObject.handPosePresetId])
    

    const fullyUpdateIkSkeleton = () => {
      if(!ref.current || !skeleton ) return
      let changedSkeleton = []
      ref.current.updateWorldMatrix(true, true)
      let inverseMatrixWorld = new THREE.Matrix4()
      inverseMatrixWorld.getInverse(ref.current.matrixWorld)
      let position = new THREE.Vector3()
      for(let i = 0; i < skeleton.bones.length; i++) {
        let bone = skeleton.bones[i]
        if(bone.name.includes("leaf")) continue
        let rotation = bone.rotation
        let boneMatrix = bone.matrixWorld.clone()
        boneMatrix.premultiply(inverseMatrixWorld)
        position = position.setFromMatrixPosition(boneMatrix)
        let quaternion = new THREE.Quaternion().setFromRotationMatrix(boneMatrix)
        boneMatrix.premultiply(ref.current.matrixWorld)
        changedSkeleton.push({ 
          id: bone.uuid,
          name: bone.name,
          position: { 
            x: position.x, 
            y: position.y, 
            z: position.z 
          }, 
          rotation: { 
            x: rotation.x, 
            y: rotation.y, 
            z: rotation.z
          },
          quaternion: {
            x: quaternion.x,
            y: quaternion.y,
            z: quaternion.z,
            w: quaternion.w
          }
        })
      }
      isFullyUpdate.current = true
      updateCharacterIkSkeleton && updateCharacterIkSkeleton({id:sceneObject.id, skeleton:changedSkeleton})
    }

    useEffect(() => {
      if(!camera) return
      SGIkHelper.getInstance().setCamera(camera)
      if(objectRotationControl.current)
          objectRotationControl.current.setCamera(camera)
    }, [camera])

    useEffect(() => {
      if(!objectRotationControl.current) return
      objectRotationControl.current.deselectObject()
      objectRotationControl.current.control.domElement = activeGL.domElement
      // find the 3D Bone matching the selectedBone uuid
      let bone = skeleton.bones.find(object => object.uuid === selectedBone)      
      if (bone) {
        objectRotationControl.current.selectObject(bone, selectedBone)
      }
    }, [activeGL])

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
    }, [skeleton, sceneObject.headScale, ready])

    useEffect(() => {
      if(!lod) return
      lod.children.forEach(skinnedMesh => {
        skinnedMesh.material.emissive.set(sceneObject.tintColor)
      })
    }, [sceneObject.tintColor, ready])

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

    // Selects character when character's model has been changed it reselects new character
    useEffect(() => {
      if(!ref.current || !ready || !lod || !ref.current.children.length || isPreview) return

      if (isSelected) {
        BonesHelper.getInstance().initialize(lod.children[0])
        if(!isUserModel(sceneObject.model) && !SGIkHelper.getInstance().isIkDisabled) {
          SGIkHelper.getInstance().initialize(ref.current, originalHeight, lod.children[0], sceneObject)
          ref.current.add(SGIkHelper.getInstance())
          ref.current.updateWorldMatrix(true, true)
        }
        ref.current.add(BonesHelper.getInstance())
      } else { 
        ref.current.remove(BonesHelper.getInstance())
        ref.current.remove(SGIkHelper.getInstance())
      }

      lod.traverse((child) => {
        if (child.isMesh) {
          setSelected(child, isSelected)
        }
      })
    }, [lod, isSelected, ready])

    useEffect(() => {
      if(!ref.current || !ready || !lod || !ref.current.children.length || !isSelected) return
      ref.current.remove(SGIkHelper.getInstance())
      SGIkHelper.getInstance().initPoleTarget(originalHeight, sceneObject, true)
      ref.current.add(SGIkHelper.getInstance())
    }, [sceneObject.poleTargets])

    useEffect(() => {
        if(!ref.current || objectRotationControl.current) return 
        objectRotationControl.current = new ObjectRotationControl(scene.children[0], camera, gl.domElement, ref.current.uuid)
        objectRotationControl.current.setUpdateCharacter((name, rotation) => { 
          
          updateCharacterSkeleton({
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
  
    const { x, y, z, visible, rotation, locked } = sceneObject

    return <group
        ref={ ref }

        onController={ visible ? () => null : null }
        userData={{
          type: "character",
          id: sceneObject.id,
          poleTargets: sceneObject.poleTargets || {},
          height: originalHeight,
          locked: locked,
          name: sceneObject.displayName
        }}

        position={ [x, z, y] }
        rotation={ [0, rotation, 0] }
        scale={ [bodyScale, bodyScale, bodyScale] }
        visible={ visible }
      >
      { lod && <primitive object={lod} /> }
      { armature && <primitive object={armature} /> }
      </group>
})

export default Character
