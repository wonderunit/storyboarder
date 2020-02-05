import React, { useMemo, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useUpdate, useThree } from 'react-three-fiber'

import traverseMeshMaterials from '../../helpers/traverse-mesh-materials'
import {useAsset} from "../../hooks/use-assets-manager";
import {SHOT_LAYERS} from "../../utils/ShotLayers";
const isUserMode = model => !!model.match(/\//)

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

const Attachable = React.memo(({ path, sceneObject, isSelected, updateObject, сharacterModelPath }) => {
    const {asset: gltf} = useAsset(path)
    const {asset: characterModel} = useAsset(сharacterModelPath)
  
    const characterObject = useRef(null)
    const [ready, setReady] = useState(false)
    const { scene } = useThree()
    const ref = useUpdate(
      self => {
        self.traverse(child => child.layers.enable(SHOT_LAYERS))
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
      if(!characterObject.current) return
      rebindAttachable()
    }, [characterModel])

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
      if(!ref.current || !characterObject.current ) return
      let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
      let bone = skinnedMesh.skeleton.bones.find(b => b.name === sceneObject.bindBone)
      let worldPosition = bone.worldPosition()
      updateObject(sceneObject.id, {
        x: worldPosition.x, y: worldPosition.y, z: worldPosition.z,
      })
    }, [sceneObject.bindBone])

    useEffect(() => {
      if(!scene.children[0]) return 
        characterObject.current = scene.children[0].children.filter(o => o.userData.id === sceneObject.attachToId)[0]
        if(!characterObject.current) return
        let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
        let bone = skinnedMesh.skeleton.bones.find(b => b.name === sceneObject.bindBone)
        if(sceneObject.status === "PENDING") {
          let modelPosition = new THREE.Vector3()
          let quat = null
          if(isUserMode(sceneObject.model)) {
            modelPosition.copy(bone.worldPosition())
            quat = bone.worldQuaternion()
          } else {
            let {x, y, z} = sceneObject
            modelPosition.set(x, y, z)
            modelPosition.multiplyScalar(1 / characterObject.current.worldScale().x)
            let newGroup = new THREE.Object3D()
            newGroup.rotation.set(sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z)
            newGroup.position.copy(modelPosition)
            bone.add(newGroup)
            bone.updateWorldMatrix(true, true)
            modelPosition = newGroup.worldPosition()
            quat = newGroup.worldQuaternion()
            bone.remove(newGroup)
          }
          let euler = new THREE.Euler().setFromQuaternion(quat)
          updateObject(sceneObject.id, {
            x: modelPosition.x, y: modelPosition.y, z: modelPosition.z,
            rotation: { x: euler.x, y: euler.y, z: euler.z },
            status: "Loaded"
          })
        }
        bone.add(ref.current)
        ref.current.updateMatrixWorld(true)
    }, [scene.children.length, ref.current])


    
    useEffect(() => {
        if(!characterObject.current) return 
        characterObject.current.updateWorldMatrix(true, true)
        let parentMatrixWorld = ref.current.parent.matrixWorld
        let parentInverseMatrixWorld = ref.current.parent.getInverseMatrixWorld()
        ref.current.applyMatrix(parentMatrixWorld)
        ref.current.position.set(sceneObject.x, sceneObject.y, sceneObject.z)
        ref.current.updateMatrixWorld(true)
        ref.current.applyMatrix(parentInverseMatrixWorld)
        ref.current.updateMatrixWorld(true)
    }, [sceneObject.x, sceneObject.y, sceneObject.z])
    
    useEffect(() => {
        if(!characterObject.current) return 
        characterObject.current.updateWorldMatrix(true, true)
        let parentMatrixWorld = ref.current.parent.matrixWorld
        let parentInverseMatrixWorld = ref.current.parent.getInverseMatrixWorld()
        ref.current.applyMatrix(parentMatrixWorld)
        ref.current.rotation.set(sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z)
        ref.current.updateMatrixWorld(true)
        ref.current.applyMatrix(parentInverseMatrixWorld)
        ref.current.updateMatrixWorld(true)
    }, [sceneObject.rotation])

    useEffect(() => {
        if(!characterObject.current) return
        let scale = sceneObject.size / characterObject.current.scale.x
        ref.current.scale.set(scale, scale, scale)
        ref.current.updateMatrixWorld(true)
    }, [sceneObject.size])

    const rebindAttachable = () => {
        let prevCharacter = characterObject.current
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

export default Attachable
