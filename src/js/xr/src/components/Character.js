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

  const [skeleton, lod, originalSkeleton] = useMemo(
    () => {
      let lod = new THREE.LOD()

      let { scene } = cloneGltf(gltf)
      let meshes = scene.children.filter(child => child.isSkinnedMesh)

      for (let i = 1, d = 0; i < meshes.length; i++, d++) {
        let mesh = meshes[i] // shared reference to the mesh in the cache
        mesh.matrixAutoUpdate = false
        lod.addLevel(mesh, d * 2)
      }

      let skeleton = lod.children[0].skeleton
      skeleton.pose()

      let originalSkeleton = skeleton.clone()
      originalSkeleton.bones = originalSkeleton.bones.map(bone => bone.clone())

      return [skeleton, lod, originalSkeleton]
    },
    [gltf]
  )

  const position = useMemo(
    () => [sceneObject.x, sceneObject.z, sceneObject.y],
    [sceneObject.x, sceneObject.y, sceneObject.z]
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

  const ref = useRef()
  useEffect(() => {
    if (ref.current) {
      console.log('updating', ref.current, sceneObject.x, sceneObject.y, sceneObject.z)

      ref.current.position.x = sceneObject.x
      ref.current.position.y = sceneObject.z
      ref.current.position.z = sceneObject.y

      ref.current.updateMatrix()
    }
  }, [ref.current, sceneObject.x, sceneObject.y, sceneObject.z])

  return lod
    ? <primitive ref={ref} object={lod} />
    : null
}

module.exports = Character
