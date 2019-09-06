const THREE = require('three')
const { useMemo, useEffect } = React = require('react')
const { useUpdate } = require('react-three-fiber')

const useGltf = require('../hooks/use-gltf')
const getFilepathForModelByType = require('../helpers/get-filepath-for-model-by-type')

const traverseMeshMaterials = require('../helpers/traverse-mesh-materials')

const VirtualCamera = require('../components/VirtualCamera')

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
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )


  const filepath = useMemo(
    () => getFilepathForModelByType(sceneObject),
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
            ref={ref => ref && ref.translate(0, 0.5, 0)}
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
              key={`${sceneObject.id}-${child.uuid}`}
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
