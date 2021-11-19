const THREE = require('three')
const { useMemo, useEffect } = React = require('react')
const { useUpdate } = require('react-three-fiber')

const getFilepathForModelByType = require('../helpers/get-filepath-for-model-by-type')

const traverseMeshMaterials = require('../helpers/traverse-mesh-materials')

const VirtualCamera = require('../components/VirtualCamera')
// import traverseAsset from '../../../shared/helpers/traverseAsset'

const traverseAsset = require('../../../shared/helpers/traverseAsset')
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
const checkStandardMaterial = (child) => {
  // child.material = !child.material.isMeshStandardMaterial ? new THREE.MeshStandardMaterial()
  if (!child.material.isMeshStandardMaterial){
    child.material = new THREE.MeshStandardMaterial()
  }
  return
}

const ModelObject = React.memo(({ model, ext, sceneObject, isSelected, children }) => {
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

    if (model) {
      return traverseAsset({asset:model,ext,sceneObject,meshFactory})
    }

    return []
  }, [sceneObject.model, model])

  useEffect(() => {
    traverseMeshMaterials(ref.current, material => {
      if (material.emissive) {
        if (isSelected) {
          material.emissive = new THREE.Color( 0x755bf9 )
          material.color = new THREE.Color( 0x222222 )
        } else if (sceneObject.blocked) {
          material.emissive = new THREE.Color( 0x000000 )
          material.color = new THREE.Color( 0x888888 )
        } else {
          material.emissive = new THREE.Color( sceneObject.tintColor || '#000000' )
          material.color = new THREE.Color( 0xcccccc )
        }
      }
    })
  }, [ref.current, isSelected, sceneObject.tintColor, sceneObject.blocked])

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
