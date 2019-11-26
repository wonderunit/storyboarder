const THREE = require('three')
const { useMemo, useEffect } = React = require('react')
const { useUpdate, useThree } = require('react-three-fiber')


const traverseMeshMaterials = require('../helpers/traverse-mesh-materials')

const VirtualCamera = require('../components/VirtualCamera')

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

const Attachable = React.memo(({ gltf, sceneObject, children }) => {
  const { scene } = useThree()
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )

  const meshes = useMemo(() => {
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
    if(!scene.children[1]) return []
    let characterObject = scene.children[1].children.filter(o => o.userData.id === sceneObject.attachToId)[0]
    let skinnedMesh = characterObject.getObjectByProperty("type", "SkinnedMesh")
    let bone = skinnedMesh.skeleton.bones.find(b => b.name === sceneObject.bindBone)
    bone.attach(ref.current)
  }, [scene.children])

  const { x, y, z, size, rotation } = sceneObject
  return <group
    ref={ref}

    onController={sceneObject.visible ? () => null : null}
    userData={{
      type: 'attachable',
      id: sceneObject.id
    }}


    position={[x, y, z]}
    scale={[size, size, size]}
    rotation={[rotation.x, rotation.y, rotation.z]}
  >
    {meshes}
    {children}
  </group>
})

module.exports = Attachable