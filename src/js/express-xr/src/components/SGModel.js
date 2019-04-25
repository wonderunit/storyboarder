const { useMemo } = React

const RoundedBoxGeometry = require('three-rounded-box')(THREE)

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  shininess: 0,
  flatShading: false
})
const boxRadius = .005
const boxRadiusSegments = 5

const SGModel = ({ id, model, modelData, x, y, z, width, height, depth }) => {
  const boxGeometry = useMemo(() => {
    const geometry = new RoundedBoxGeometry( 1, 1, 1, boxRadius, boxRadiusSegments )
    geometry.translate( 0, 1 / 2, 0 )
    return geometry
  })

  return <mesh
    userData={{ id }}
    position={[ x, z, y ]}
    scale={[ width, height, depth ]}
    geometry={boxGeometry}
    material={materialFactory()}
    />
}

module.exports = SGModel
