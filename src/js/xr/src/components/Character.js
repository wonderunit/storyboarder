const THREE = require('three')
const { useMemo } = React = require('react')
const { useUpdate } = require('react-three-fiber')

const cloneGltf = require('../helpers/clone-gltf')
const isUserModel = require('../helpers/is-user-model')

const VirtualCamera = require('../components/VirtualCamera')

const BonesHelper = require('../three/BonesHelper')

const Character = React.memo(({ gltf, sceneObject, modelSettings, isSelected }) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )

  const [skeleton, lod, originalSkeleton, armature, originalHeight] = useMemo(
    () => {
      let lod = new THREE.LOD()

      let { scene } = cloneGltf(gltf)
      let meshes = scene.children.filter(child => child.isSkinnedMesh)

      let map

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

      let originalHeight
      if (isUserModel(sceneObject.model)) {
        originalHeight = 1
      } else {
        let bbox = new THREE.Box3().setFromObject(lod)
        originalHeight = bbox.max.y - bbox.min.y
      }


      return [skeleton, lod, originalSkeleton, armature, originalHeight]
    },
    [gltf]
  )

  useMemo(() => {
    if (!skeleton) return

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
    if (modelSettings && modelSettings.validMorphTargets) {
      lod.children.forEach(skinnedMesh => {
        skinnedMesh.material.morphTargets = skinnedMesh.material.morphNormals = sceneObject.model !== 'baby'
        modelSettings.validMorphTargets.forEach((name, index) => {
          skinnedMesh.morphTargetInfluences[index] = sceneObject.morphTargets[name]
        })
      })
    }
  }, [modelSettings, sceneObject.morphTargets])

  useMemo(() => {
    if (isSelected) {
      BonesHelper.getInstance().initialize(lod.children[0])
      ref.current && ref.current.add(BonesHelper.getInstance())
    } else {
      ref.current && ref.current.remove(BonesHelper.getInstance())
    }
  }, [ref.current, isSelected])

  return lod
    ? <group
      ref={ref}

      onController={sceneObject.visible ? () => null : null}
      userData={{
        type: 'character',
        id: sceneObject.id
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
