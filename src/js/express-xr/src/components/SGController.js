const { useMemo } = React

const materialFactory = () =>
  new THREE.MeshToonMaterial({
    color: 0xcccccc,
    emissive: 0x0,
    specular: 0x0,
    shininess: 0,
    flatShading: false
  })

const meshFactory = originalMesh => {
  let mesh = originalMesh.clone()
  let material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const SGController = ({ id, model, modelData, x, y, z, width, height, depth, rotation, visible, flipModel, ...props }) => {
  const children = useMemo(() => {
    if (model === 'controller-left') {
      let children = []
      let index = 0

      if (modelData) {
        modelData.scene.traverse(function(child) {
          if (child instanceof THREE.Mesh) {
            children.push(<primitive key={`${id}-${index}`} object={meshFactory(child.clone())} />)
            index++
          }
        })
      }
      return children
    }

    return []
  }, [model, modelData])

  return (
    <group
      userData={{ id, type: props.type, forPanel: { width, height, depth } }}
      visible={visible}
      position={[x, z, y]}
      scale={[width * (flipModel ? -1 : 1), height, depth]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    >
      {children}
    </group>
  )
}

module.exports = SGController
