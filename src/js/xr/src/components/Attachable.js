const THREE = require('three')
const { useMemo, useEffect, useRef, useState } = React = require('react')
const { useUpdate, useThree } = require('react-three-fiber')


const traverseMeshMaterials = require('../helpers/traverse-mesh-materials')

const VirtualCamera = require('../components/VirtualCamera')

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
  mesh.geometry.computeBoundingSphere()
  mesh.position.copy(mesh.geometry.boundingSphere.center)
  mesh.position.negate()
  mesh.updateMatrixWorld(true)
  return mesh
}

const Attachable = React.memo(({ gltf, sceneObject, isSelected, updateObject}) => {
  const characterObject = useRef(null)
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
    ref.current.rebindAttachable = rebindAttachable
    ref.current.saveToStore = saveToStore
  }, []) 

  useEffect(() => {
  }, [ref.current])

  useEffect(() => {
    traverseMeshMaterials(ref.current, material => {
      if (material.emissive) {
        if (isSelected) {
          material.emissive = new THREE.Color( 0x755bf9 )
          material.color = new THREE.Color( 0x222222 )
        } else {
          material.emissive = new THREE.Color( '#000000' )
          material.color = new THREE.Color( 0xcccccc )
        }
      }
    })
  }, [isSelected])

  useEffect(() => {
    if(!scene.children[1]) return 
    //console.log("character object changed", characterObject.curent)
    characterObject.current = scene.children[1].children.filter(o => o.userData.id === sceneObject.attachToId)[0]
    if(!characterObject.current) return
    let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
    let bone = skinnedMesh.skeleton.bones.find(b => b.name === sceneObject.bindBone)
    bone.add(ref.current)
    if(!characterObject.current.attachables) {
      characterObject.current.attachables = []
      characterObject.current.attachables.push(ref.current)
    } else {
      let isAdded = characterObject.current.attachables.some(attachable => attachable.uuid === ref.current.uuid)
      if(!isAdded) {
        characterObject.current.attachables.push(ref.current)
      }
    }
    ref.current.updateMatrixWorld(true)
  }, [scene.children.length])
  
  useEffect(() => {
    characterObject.current = scene.children[1].children.filter(o => o.userData.id === sceneObject.attachToId)[0]
    if(!characterObject.current) return 
    
    let parentMatrixWorld = ref.current.parent.matrixWorld
    let parentInverseMatrixWorld = ref.current.parent.getInverseMatrixWorld()
    ref.current.applyMatrix(parentMatrixWorld)
    ref.current.position.set(sceneObject.x, sceneObject.y, sceneObject.z)
    ref.current.updateMatrixWorld(true)
    ref.current.applyMatrix(parentInverseMatrixWorld)
    ref.current.updateMatrixWorld(true)
  }, [sceneObject.x, sceneObject.y, sceneObject.z, characterObject.current])
  
  useEffect(() => {
    characterObject.current = scene.children[1].children.filter(o => o.userData.id === sceneObject.attachToId)[0]
    if(!characterObject.current) return 
    characterObject.current.updateWorldMatrix(true, true)
    let parentMatrixWorld = ref.current.parent.matrixWorld
    let parentInverseMatrixWorld = ref.current.parent.getInverseMatrixWorld()
    ref.current.applyMatrix(parentMatrixWorld)
    ref.current.rotation.set(sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z)
    ref.current.updateMatrixWorld(true)
    ref.current.applyMatrix(parentInverseMatrixWorld)
    ref.current.updateMatrixWorld(true)

  }, [sceneObject.rotation, characterObject.current])

  useEffect(() => {
    if(!characterObject.current) return
    let scale = sceneObject.size / characterObject.current.scale.x
    ref.current.scale.set(scale, scale, scale)
    ref.current.updateMatrixWorld(true)
  }, [sceneObject.size, characterObject.current])

  const rebindAttachable = () => {

    let prevCharacter = characterObject.current
    characterObject.current = scene.children[1].children.filter(child => child.userData.id === sceneObject.attachToId)[0]
    if(!characterObject.current) return
    
    let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
    let skeleton = skinnedMesh.skeleton
    let bone = skeleton.getBoneByName(sceneObject.bindBone)
    bone.add(ref.current)
    let scale = sceneObject.size / characterObject.current.scale.x
    ref.current.scale.set(scale, scale, scale)
    ref.current.updateWorldMatrix(true, true)

    // Adds a ref of attachable to character if it doesn't exist and adds current attachable
    if(!characterObject.current.attachables) {
      characterObject.current.attachables = []
      characterObject.current.attachables.push(ref.current)
    } else {
      let isAdded = characterObject.current.attachables.some(attachable => attachable.uuid === ref.current.uuid)
      if(!isAdded) {
        characterObject.current.attachables.push(ref.current)
      }
    }
    saveToStore()
  }
  
  const saveToStore = () => {
    let position = ref.current.worldPosition()// new THREE.Vector3()
    let quaternion = ref.current.worldQuaternion()
    let matrix = ref.current.matrix.clone()
    matrix.premultiply(ref.current.parent.matrixWorld)
    matrix.decompose(position, quaternion, new THREE.Vector3())
    let rot = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ')
    updateObject(sceneObject.id, { x: position.x, y: position.y, z: position.z,
      rotation: {x: rot.x, y: rot.y, z: rot.z}})
  }

  return <group
    ref={ref}

    onController={() => null}
    userData={{
      type: 'attachable',
      id: sceneObject.id,
      attachToId: sceneObject.attachToId
    }}
  >
    {meshes}
  </group>
})

module.exports = Attachable