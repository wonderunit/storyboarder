const THREE = require('three')
const { useMemo, useRef, useEffect } = React = require('react')

const useGltf = require('../hooks/use-gltf')

const traverseMeshMaterials = require('../helpers/traverse-mesh-materials')

const materialFactory = () => new THREE.MeshLambertMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  flatShading: false
})

const meshFactory = source => {
  let mesh = source.clone()

  let material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const ModelObject = React.memo(({ sceneObject, isSelected, children }) => {
  const ref = useRef(null)
  // TODO detect user models / custom objects
  const filepath = useMemo(
    () => `/data/system/objects/${sceneObject.model}.glb`,
    [sceneObject.model]
  )

  const gltf = sceneObject.model === 'box'
    ? null
    : useGltf(filepath)

  const meshes = useMemo(() => {
    if (sceneObject.model === 'box') {
      return [
        <mesh key={sceneObject.id}>
          <boxBufferGeometry
            ref={ref => ref.translate(0, 0.5, 0)}
            attach='geometry'
            args={[1, 1, 1]} />
          <primitive
            attach='material'
            object={materialFactory()} />
        </mesh>
      ]
    }

    if (gltf) {
      let children = []
      gltf.scene.traverse(child => {
        if (child.isMesh) {
          children.push(
            <primitive
              key={sceneObject.id}
              object={meshFactory(child)}
            />
          )
        }
      })
      return children
    }

    return []
  }, [sceneObject.model, gltf])

  useEffect(() => {
    let amp = isSelected ? 0.2 : 0

    traverseMeshMaterials(ref.current, material => {
      if (material.emissive) {
        material.emissive.r = 0x9a / 0xff * amp
        material.emissive.b = 0x72 / 0xff * amp
        material.emissive.b = 0xe9 / 0xff * amp
      }
    })
  }, [ref.current, isSelected])

  const { x, y, z, visible, width, height, depth, rotation } = sceneObject

  return <group
    ref={ref}

    onController={sceneObject.visible ? () => null : null}
    userData={{
      type: 'object',
      id: sceneObject.id
    }}

    visible={visible}
    position={[x, z, y]}
    scale={[width, height, depth]}
    rotation={[rotation.x, rotation.y, rotation.z]}
  >
    {meshes}
    {children}
  </group>
})

module.exports = ModelObject
