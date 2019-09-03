const THREE = require('three')
const { useMemo, useRef } = React = require('react')

const useGltf = require('../hooks/use-gltf')
const cloneGltf = require('../helpers/clone-gltf')

const BonesHelper = require('../three/BonesHelper')

const Character = React.memo(({ sceneObject, modelSettings, isSelected }) => {
  const ref = useRef()

  // TODO detect user models, e.g.: `/data/user/characters/${filename}`
  const filepath = useMemo(
    () => `/data/system/dummies/gltf/${sceneObject.model}-lod.glb`,
    [sceneObject.model]
  )

  const gltf = useGltf(filepath)

  const [skeleton, lod, originalSkeleton, armature, originalHeight] = useMemo(
    () => {
      let lod = new THREE.LOD()

      let { scene } = cloneGltf(gltf)
      let meshes = scene.children.filter(child => child.isSkinnedMesh)

      let map

      for (let i = 1, d = 0; i < meshes.length; i++, d++) {
        let mesh = meshes[i]
        mesh.matrixAutoUpdate = false
        map = mesh.material.map
        mesh.material = new THREE.MeshBasicMaterial({
          map: map,
          skinning: true,
          morphTargets: true,
          color: 0xffffff
        })
        lod.addLevel(mesh, d * 4)
      }

      let skeleton = lod.children[0].skeleton
      skeleton.pose()

      let originalSkeleton = skeleton.clone()
      originalSkeleton.bones = originalSkeleton.bones.map(bone => bone.clone())

      let armature = scene.children[0].children[0]

      let bbox = new THREE.Box3().setFromObject(lod)
      let originalHeight = bbox.max.y - bbox.min.y

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
          bone.rotation.copy(state.rotation)
          // and update
          bone.updateMatrixWorld()
        }
      }
    } else {
      // reset the pose
      skeleton.pose()
    }
  }, [skeleton, sceneObject.skeleton])

  const bodyScale = useMemo(() => {
    // for built-in characters
    return sceneObject.height / originalHeight

    // TODO handle custom characters and use an absolute height
    // return sceneObject.height
  }, [sceneObject.height])
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
      rotation-y={sceneObject.rotation}
      scale={[bodyScale, bodyScale, bodyScale]}
    >
      <primitive object={lod} />
      <primitive object={armature} />
    </group>
    : null
})

module.exports = Character
