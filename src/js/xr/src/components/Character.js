const THREE = require('three')
const { useMemo, useEffect, useState, useRef } = React = require('react')
const { useUpdate, useThree } = require('react-three-fiber')

const cloneGltf = require('../helpers/clone-gltf')
const isUserModel = require('../helpers/is-user-model')

const VirtualCamera = require('../components/VirtualCamera')

const BonesHelper = require('../three/BonesHelper')
const IKHelper = require('../../../shared/IK/IkHelper')
let attachablesList = []
let isUnmounted = []
let isClonned = []

const Character = React.memo(({ gltf, sceneObject, modelSettings, isSelected, updateSkeleton, deleteObjects}) => {
  const prevGltf = useRef(null)
  const { scene } = useThree()
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )

  useEffect(() => { 
    return () => {
      if(ref.current && ref.current.attachables) {
        attachablesList = ref.current.attachables.concat([])
        for(let i = 0; i < attachablesList.length; i++) { 
          if(attachablesList[i].parent) {
            attachablesList[i].parent.remove(attachablesList[i])
          }
        }
        isUnmounted[sceneObject.id] = true
        ref.current.userData.isUnmounted = true
      }
    }
  }, [])


  const [skeleton, lod, originalSkeleton, armature, originalHeight] = useMemo(
    () => {
      if(ref.current && ref.current.attachables) {
        attachablesList = ref.current.attachables.concat([])
        for(let i = 0; i < attachablesList.length; i++) { 
          if(attachablesList[i].parent) {
            attachablesList[i].parent.remove(attachablesList[i])
          }
        }
        isUnmounted[sceneObject.id] = true
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

        // // basic material
        // mesh.material = new THREE.MeshBasicMaterial({
        //   map: map,
        //   skinning: true,
        //   morphTargets: true,
        //   color: 0xffffff
        // })
        lod.addLevel(mesh, d * 4)
      }

      let skeleton = lod.children[0].skeleton
      skeleton.pose()

      let originalSkeleton = skeleton.clone()
      originalSkeleton.bones = originalSkeleton.bones.map(bone => bone.clone())

      let armature = scene.children[0].children[0]
     // console.log(armature.clone())
      let originalHeight
      if (isUserModel(sceneObject.model)) {
        originalHeight = 1
      } else {
        let bbox = new THREE.Box3().setFromObject(lod)
        originalHeight = bbox.max.y - bbox.min.y
      }
      isClonned[sceneObject.id] = true
      return [skeleton, lod, originalSkeleton, armature, originalHeight]
    },
    [gltf]
  )

  useEffect(() => {
    if(!lod) return
    if(!ref.current) return
    if(attachablesList.length && isUnmounted[sceneObject.id] && isClonned[sceneObject.id]) { 
      ref.current.attachables = []
      for(let i = 0; i < attachablesList.length; i++) {
        attachablesList[i].rebindAttachable(sceneObject.height / ref.current.userData.originalHeight)
      }
      attachablesList = []
      isUnmounted[sceneObject.id] = false
      isClonned[sceneObject.id] = false
    }
    return () => {
      if(ref.current && ref.current.attachables ) {
        attachablesList = ref.current.attachables.concat([])
        for(let i = 0; i < attachablesList.length; i++) { 
          if(attachablesList[i].parent) {
          //  console.log( attachablesList[i].clone())
            attachablesList[i].parent.remove(attachablesList[i])
          }
        }
        isUnmounted[sceneObject.id] = true
      }
    }
  }, [ref.current, lod, attachablesList.length])


  useMemo(() => {
    if (!skeleton) return
  //  console.log("Skeleton changed", skeleton.bones[0].clone())
    // has the user entered data for at least one bone?
    let hasModifications = Object.values(sceneObject.skeleton).length > 0

    if (hasModifications) {
      // go through all the bones in the skeleton
      for (bone of skeleton.bones) {
        // if user data exists for a bone, use it
        let modified = sceneObject.skeleton[bone.name]
        // otherwise, use our original skeleton for reference
        let original = originalSkeleton.getBoneByName(bone.name)

        // call this state
        let state = modified || original
       // console.log(modified)

        // if the state differs for this bone
        if (bone.rotation.equals(state.rotation) == false) {
          // rotate the bone
          bone.rotation.setFromVector3(state.rotation)

          if(state.position)
            bone.position.set(state.position.x, state.position.y, state.position.z)
          // and update
          bone.updateMatrixWorld(true)
        }
      }
    } else {
      // reset the pose
      skeleton.pose()
    }
  }, [skeleton, sceneObject.skeleton])

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

  const bodyScale = useMemo(
    () => sceneObject.height / originalHeight,
    [sceneObject.height]
  )

  // headScale (0.8...1.2)
  useMemo(() => {
    let headBone = skeleton.getBoneByName('Head')
    if (headBone) {
      // in prior versions, the head was scaled proportionally to the body
      // before applying the user's percentage adjustment
      //
      // now we just use the user's percentage value directly
      headBone.scale.setScalar(sceneObject.headScale)
    }
  }, [skeleton, sceneObject.headScale])

  useMemo(() => {
    lod.children.forEach(skinnedMesh => {
      skinnedMesh.material.emissive.set(sceneObject.tintColor)
    })
  }, [sceneObject.tintColor])

  useMemo(() => {
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

  useMemo(() => {
    if(!ref.current) return
    if (isSelected) {

      BonesHelper.getInstance().initialize(lod.children[0])
      if(!isUserModel(sceneObject.model) && !IKHelper.getInstance().isIkDisabled)
      {
        IKHelper.getInstance().initialize(lod.children[0], sceneObject.height)
        ref.current.add(IKHelper.getInstance())
      }
      ref.current.add(BonesHelper.getInstance())
    } else {
      ref.current.remove(BonesHelper.getInstance())
      ref.current.remove(IKHelper.getInstance())
    }
  }, [ref.current, isSelected])

  useMemo(() => {
    console.log("Changed posePresetId", sceneObject.posePresetId)
    if(ref.current && ref.current.attachables) {
      let attachablesToDelete = []
      for(let i = 0; i < ref.current.attachables.length; i++) {
        attachablesToDelete.push(ref.current.attachables[i].userData.id)
      }
      deleteObjects(attachablesToDelete)
    }
  }, [sceneObject.posePresetId])

  return lod
    ? <group
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
      <primitive object={lod} />
      <primitive object={armature} />
    </group>
    : null
})

module.exports = Character
