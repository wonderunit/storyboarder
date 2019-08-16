const THREE = require('three')
const { useMemo, useEffect, useRef } = React = require('react')

const { unstable_createResource } = require('../../vendor/react-cache')
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader')

const cloneGltf = require('../helpers/clone-gltf')

const resource = unstable_createResource(
  file => new Promise(async res => new GLTFLoader().load(file, res))
)

const Character = ({ sceneObject }) => {
  // TODO detect user models, e.g.: `/data/user/characters/${filename}`
  const filepath = useMemo(
    () => `/data/system/dummies/gltf/${sceneObject.model}-lod.glb`,
    [sceneObject.model]
  )

  const gltf = resource.read(filepath)

  const [skeleton, lod, originalSkeleton, armature] = useMemo(
    () => {
      let lod = new THREE.LOD()

      let { scene } = cloneGltf(gltf)
      let meshes = scene.children.filter(child => child.isSkinnedMesh)

      let map

      for (let i = 1, d = 0; i < meshes.length; i++, d++) {
        let mesh = meshes[i] // shared reference to the mesh in the cache
        mesh.matrixAutoUpdate = false
        map = mesh.material.map
        mesh.material = new THREE.MeshBasicMaterial({map: map, skinning: true, morphTargets: true, color: 0xffcccc})
        lod.addLevel(mesh, d * 4)
      }

      let skeleton = lod.children[0].skeleton
      skeleton.pose()

      let originalSkeleton = skeleton.clone()
      originalSkeleton.bones = originalSkeleton.bones.map(bone => bone.clone())

      let armature = scene.children[0].children[0]

      return [skeleton, lod, originalSkeleton, armature]
    },
    [gltf]
  )

  useMemo(() => {
    if (!skeleton) return

    let hasModifications = Object.values(sceneObject.skeleton).length

    if (hasModifications) {
      for (bone of skeleton.bones) {
        let modified = sceneObject.skeleton[bone.name]
        let original = originalSkeleton.getBoneByName(bone.name)

        let state = modified || original

        if (
          bone.rotation.x != state.rotation.x ||
          bone.rotation.y != state.rotation.y ||
          bone.rotation.z != state.rotation.z
        ) {
          bone.rotation.x = state.rotation.x
          bone.rotation.y = state.rotation.y
          bone.rotation.z = state.rotation.z
          bone.updateMatrixWorld()
        }
      }
    } else {
      skeleton.pose()
    }
  }, [skeleton, sceneObject.skeleton])

  return lod
    ? <group position={[sceneObject.x, sceneObject.z, sceneObject.y]}>
      <primitive object={lod} />
      <primitive object={armature} />
    </group>
    : null
}

module.exports = Character
