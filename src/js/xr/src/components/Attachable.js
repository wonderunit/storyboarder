const THREE = require('three')
const { useMemo, useEffect, useRef, useState } = React = require('react')
const { useUpdate, useThree } = require('react-three-fiber')


const traverseMeshMaterials = require('../helpers/traverse-mesh-materials')

const VirtualCamera = require('../components/VirtualCamera')

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
  mesh.geometry.computeBoundingSphere()
  mesh.position.copy(mesh.geometry.boundingSphere.center)
  mesh.position.negate()
  mesh.updateMatrixWorld(true)
  return mesh
}

const Attachable = React.memo(({ gltf, sceneObject, isSelected, updateObject, characterModel, characterChildrenLength, rootRef, character}) => {
    const characterObject = useRef(null)
    const { scene } = useThree()
    const [characterLOD, setCharacterLOD] = useState()
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
                key={`${sceneObject.id}-${child.uuid}-${Math.random()}`}
                object={meshFactory(child)}
                userData={{type:'attachable'}}
              />
            )
          }
        })
        return children
      }
      return null
    }, [gltf, characterModel])

    useEffect(() => {
      if(ref.current && rootRef)
        rootRef.add(ref.current)
      return () => {
        if(ref.current && rootRef)
          rootRef.add(ref.current)
      }
    }, [characterModel])

    useEffect(() => {
      if(!ref.current) return 
      let index = scene.__interaction.indexOf(ref.current)
      if (index === -1) scene.__interaction.push(ref.current) 
    }, [characterModel])

    useEffect(() => {
      return () => {
        if(!characterObject.current || !ref.current.parent) return
        ref.current.parent.remove(ref.current)
      }
    }, [])

    useEffect(() => {  
      if(!(characterChildrenLength > 0)) return
      let object = scene.__interaction.filter(o => o.userData.id === sceneObject.attachToId)[0]
      setCharacterLOD(object.getObjectByProperty("type", "LOD"))
    }, [characterChildrenLength])

    useEffect(() => {
      if(!characterObject.current) return
      rebindAttachable()
    }, [characterModel])

    useEffect(() => {
      if(!ref.current) return
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
      if(!ref.current || !characterObject.current ) return
      rebindAttachable()
    }, [sceneObject.bindBone])

    useEffect(() => {
      if(!characterModel || !characterLOD) return 
        characterObject.current = scene.__interaction.filter(o => o.userData.id === sceneObject.attachToId)[0]
        if(!characterObject.current) return
        let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
        let bone = skinnedMesh.skeleton.bones.find(b => b.name === sceneObject.bindBone)
        bone.add(ref.current)
        ref.current.updateMatrixWorld(true)
    }, [characterLOD])
    
    useEffect(() => {
      if(!characterObject.current || !ref.current.parent) return 
      characterObject.current.updateWorldMatrix(true, true)
      let parentMatrixWorld = ref.current.parent.matrixWorld
      let parentInverseMatrixWorld = ref.current.parent.getInverseMatrixWorld()
      ref.current.applyMatrix4(parentMatrixWorld)
      ref.current.position.set(sceneObject.x, sceneObject.y, sceneObject.z)
      ref.current.updateMatrixWorld(true)
      ref.current.applyMatrix4(parentInverseMatrixWorld)
      ref.current.updateMatrixWorld(true)
    }, [sceneObject.x, sceneObject.y, sceneObject.z, characterLOD])
    
    useEffect(() => {
      if(!characterObject.current || !ref.current.parent) return 
      characterObject.current.updateWorldMatrix(true, true)
      let parentMatrixWorld = ref.current.parent.matrixWorld
      let parentInverseMatrixWorld = ref.current.parent.getInverseMatrixWorld()
      ref.current.applyMatrix4(parentMatrixWorld)
      ref.current.rotation.set(sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z)
      ref.current.updateMatrixWorld(true)
      ref.current.applyMatrix4(parentInverseMatrixWorld)
      ref.current.updateMatrixWorld(true)
    }, [sceneObject.rotation, characterLOD])

    useEffect(() => {
      if(!characterObject.current || !ref.current.parent) return
      let scale = sceneObject.size / characterObject.current.scale.x
      ref.current.scale.set(scale, scale, scale)
      ref.current.updateMatrixWorld(true)
    }, [sceneObject.size, characterLOD])

    useEffect(() => {
      if(!characterObject.current || !ref.current || !characterLOD || !ref.current.parent) return
      characterObject.current.updateWorldMatrix(false, true)
      saveToStore()
    }, [character.x, character.y, character.z, character.rotation, character.height, character.skeleton])

    const rebindAttachable = () => {
      characterObject.current = scene.__interaction.filter(child => child.userData.id === sceneObject.attachToId)[0]
      if(!characterObject.current ) return
      
      let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
      if(!skinnedMesh) return
      let skeleton = skinnedMesh.skeleton
      let bone = skeleton.getBoneByName(sceneObject.bindBone)
      bone.add(ref.current)
      let scale = sceneObject.size / characterObject.current.scale.x
      ref.current.scale.set(scale, scale, scale)
      ref.current.updateWorldMatrix(true, true)
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
        ref={ ref }

        onController={ () => null }
        userData={{
          type: "attachable",
          id: sceneObject.id,
          bindedId: sceneObject.attachToId
        }}>
        {meshes}
    </group>
})

module.exports = Attachable