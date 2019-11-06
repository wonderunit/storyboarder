const THREE = require('three')

const { useMemo, useEffect } = React = require('react')
const { useUpdate } = require('react-three-fiber')

const traverseMeshMaterials = require('../helpers/traverse-mesh-materials')

const VirtualCamera = require('../components/VirtualCamera')

const getObjectTween = require('../../../utils/objectTween')

// old material
// const materialFactory = () => new THREE.MeshLambertMaterial({
//   color: 0xcccccc,
//   emissive: 0x0,
//   flatShading: false
// })

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  reflectivity: 0x0,
  skinning: false,
  shininess: 0,
  flatShading: false,
  morphNormals: false,
  morphTargets: false
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

const ModelObject = React.memo(({ gltf, sceneObject, isSelected, children }) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )

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
    traverseMeshMaterials(ref.current, material => {
      if (material.emissive) {
        if (isSelected) {
          material.emissive = new THREE.Color( 0x755bf9 )
          material.color = new THREE.Color( 0x222222 )
        } else {
          material.emissive = new THREE.Color( sceneObject.tintColor || '#000000' )
          material.color = new THREE.Color( 0xcccccc )
        }
      }
    })
  }, [ref.current, isSelected, sceneObject.tintColor])
  
  let objectTween = getObjectTween(ref)
  
  useEffect(() => {
    if (sceneObject.remoteUpdate) {
      objectTween({x: sceneObject.x, y: sceneObject.z, z: sceneObject.y}, sceneObject.rotation)
    } else {
      ref.current.position.set(sceneObject.x, sceneObject.z, sceneObject.y)
      ref.current.rotation.set(sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z)
    }
  }, [
    ref.current,
    sceneObject.x, sceneObject.y, sceneObject.z,
    sceneObject.rotation
  ])
  
  const {visible, width, height, depth} = sceneObject

  return <group
    ref={ref}

    onController={sceneObject.visible ? () => null : null}
    userData={{
      type: 'object',
      id: sceneObject.id
    }}

    visible={visible}
    scale={[width, height, depth]}
  >
    {meshes}
    {children}
  </group>
})

module.exports = ModelObject
