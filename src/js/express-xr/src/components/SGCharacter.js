const { useMemo } = React
const { useUpdate } = require('react-three-fiber')
require('../../../vendor/three/examples/js/utils/SkeletonUtils')

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  shininess: 0,
  flatShading: false
})

const SGCharacter = ({ id, model, modelData, x, y, z }) => {
  const skinnedMesh = useMemo(
    () => {
      if (modelData) {
        let source = (
          modelData.scene.children.find(child => child instanceof THREE.SkinnedMesh) ||
          modelData.scene.children[0].children.find(child => child instanceof THREE.SkinnedMesh)
        )
        return THREE.SkeletonUtils.clone(source)
      }
    },
    [modelData]
  )

  const material = useMemo(materialFactory)

  return skinnedMesh
    ? <group
      userData={{ id }}
      position={[ x, z, y ]}
      >
        <primitive object={skinnedMesh} material={material} />
      </group>
    : null
}

module.exports = SGCharacter
