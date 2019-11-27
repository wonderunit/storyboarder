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

const Attachable = React.memo(({ gltf, sceneObject, children, isSelected }) => {
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
              userData={{type:'attachable'}}
            />
          )
        }
      })

      return children
    }

    return []
  }, [sceneObject.model, gltf])

  useEffect(() => {
    console.log("Attachable is selected")
  }, [isSelected])

  useEffect(() => {
    if(!scene.children[1]) return []
   // console.log("Object added")
    let characterObject = scene.children[1].children.filter(o => o.userData.id === sceneObject.attachToId)[0]
    let skinnedMesh = characterObject.getObjectByProperty("type", "SkinnedMesh")
    let bone = skinnedMesh.skeleton.bones.find(b => b.name === sceneObject.bindBone)
    bone.add(ref.current)
    ref.current.updateMatrixWorld(true)
  }, [scene.children])
  
  useEffect(() => {
    let parentMatrixWorld = ref.current.parent.matrixWorld
    let parentInverseMatrixWorld = ref.current.parent.getInverseMatrixWorld()
    ref.current.applyMatrix(parentMatrixWorld)
    ref.current.position.set(sceneObject.x, sceneObject.y, sceneObject.z)
    ref.current.updateMatrixWorld(true)
    ref.current.applyMatrix(parentInverseMatrixWorld)
    ref.current.updateMatrixWorld(true)
  }, [sceneObject.x, sceneObject.y, sceneObject.z])
  
  useEffect(() => {
    let parentMatrixWorld = ref.current.parent.matrixWorld
    let parentInverseMatrixWorld = ref.current.parent.getInverseMatrixWorld()
    ref.current.applyMatrix(parentMatrixWorld)
    ref.current.rotation.set(sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z)
    ref.current.updateMatrixWorld(true)
    ref.current.applyMatrix(parentInverseMatrixWorld)
    ref.current.updateMatrixWorld(true)
  }, [sceneObject.rotation])

  const { x, y, z, size, rotation } = sceneObject
  return <group
    ref={ref}

    onController={() => null}
    userData={{
      type: 'attachable',
      id: sceneObject.id,
      attachToId: sceneObject.attachToId
    }}

    scale={[size, size, size]}
  >
    {meshes}
    {children}
  </group>
})

module.exports = Attachable