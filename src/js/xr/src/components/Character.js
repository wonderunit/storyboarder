const THREE = require('three')
const { useMemo } = React = require('react')

const { unstable_createResource } = require('../../vendor/react-cache')
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader')

const resource = unstable_createResource(
  file => new Promise(async res => new GLTFLoader().load(file, res))
)

const Character = ({ sceneObject }) => {
  // TODO detect user models, e.g.: `/data/user/characters/${filename}`
  const filepath = useMemo(
    () => `/data/system/dummies/gltf/${sceneObject.model}-lod.glb`,
    [sceneObject.model]
  )

  const { scene } = resource.read(filepath)

  const [skeleton, lod] = useMemo(
    () => {
      let lod = new THREE.LOD()

      let meshes = scene.children.filter(child => child.isSkinnedMesh)

      for (let i = 1, d = 0; i < meshes.length; i++, d++) {
        let mesh = meshes[i] // shared reference to the mesh in the cache
        lod.addLevel(mesh, d * 2)
      }

      let skeleton = lod.children[0].skeleton
      skeleton.pose()

      return [skeleton, lod]
    },
    [scene]
  )

  const position = useMemo(
    () => [sceneObject.x, sceneObject.z, sceneObject.y],
    [sceneObject.x, sceneObject.y, sceneObject.z]
  )

  return lod
    ? <primitive object={lod} position={position} />
    : null
}

module.exports = Character
