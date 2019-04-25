const { useMemo } = React
const { useUpdate } = require('react-three-fiber')
require('../../../vendor/three/examples/js/utils/SkeletonUtils')

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  specular: 0x0,
  // skinning: true,
  shininess: 0,
  flatShading: false,
  morphNormals: true,
  morphTargets: true
})

const SGCharacter = ({ id, model, modelData, x, y, z }) => {
  const skinnedMesh = useMemo(
    () => {
      if (modelData) {
        let source = (
          modelData.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
          modelData.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)
        )

        let skinnedMesh =  THREE.SkeletonUtils.clone(source)

        let material = materialFactory()
        if (skinnedMesh.material.map) {
          material.map = skinnedMesh.material.map
          material.map.needsUpdate = true
        }
        skinnedMesh.material = material

        return skinnedMesh
      }
    },
    [modelData]
  )

  return skinnedMesh
    ? <group
      userData={{ id }}
      position={[ x, z, y ]}
      >
        <primitive object={skinnedMesh} />
      </group>
    : null
}

module.exports = SGCharacter
