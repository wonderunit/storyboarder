const { useMemo } = React

const RoundedBoxGeometry = require('three-rounded-box')(THREE)

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  shininess: 0,
  flatShading: false
})

const meshFactory = originalMesh => {
  let mesh = originalMesh.clone()

  // create a skeleton if one is not provided
  if (mesh instanceof THREE.SkinnedMesh && !mesh.skeleton) {
    mesh.skeleton = new THREE.Skeleton()
  }

  let material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const boxRadius = .005
const boxRadiusSegments = 5

const SGModel = ({ id, model, modelData, x, y, z, width, height, depth, rotation, visible, ...props }) => {
  const boxGeometry = useMemo(() => {
    const geometry = new RoundedBoxGeometry( 1, 1, 1, boxRadius, boxRadiusSegments )
    geometry.translate( 0, 1 / 2, 0 )
    return geometry
  })

  const children = useMemo(() => {
    if (model === 'box') {
      return [
        <mesh
          key={id}
          geometry={boxGeometry}
          material={materialFactory()}
        />
      ]
    }

    if (modelData) {
      let children = []
      modelData.scene.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
          children.push(<primitive key={id} object={meshFactory(child.clone())} />)
        }
      })
      return children
    }

    return []
  }, [model, modelData])

  return <group
    userData={{ id, type: props.type }}

    visible={visible}
    position={[ x, z, y ]}
    scale={[ width, height, depth ]}
    rotation={[ rotation.x, rotation.y, rotation.z ]}
    >
      {children}
    </group>
}

module.exports = SGModel
