import React, { useMemo, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useUpdate, useThree } from 'react-three-fiber'
import {useAsset} from '../shot-generator/hooks/use-assets-manager'
import {SHOT_LAYERS} from '../shot-generator/utils/ShotLayers'
import isUserModel from '../shot-generator/helpers/isUserModel'
import {patchMaterial, setSelected} from "../shot-generator/helpers/outlineMaterial";

const materialFactory = () => patchMaterial(new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  skinning: false,
  shininess: 0,
  flatShading: false,
  morphNormals: false,
  morphTargets: false
}))

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

const Attachable = React.memo(({ path, sceneObject, isSelected, сharacterModelPath, character }) => {
    const {asset: gltf} = useAsset(path)
    const {asset: characterModel} = useAsset(сharacterModelPath)
    const [characterLOD, setCharacterLOD] = useState()
    const characterObject = useRef(null)
    const prevModelName = useRef(null)
    const isAttachableSelected = useRef(null)
    const { scene } = useThree()
    const [isAllowedToInitialize, setAllowToInitialize] = useState(false)
    const originalPosition = useRef(null)
    const originalHeight = useRef(null)
    const offsetToCharacter = useRef(null)

    const [characterChildrenLength, setCharacterChildrenLength] = useState(0)
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

    const sceneCharacter = scene.__interaction.filter(o => o.userData.id === sceneObject.attachToId)[0]
    const length = sceneCharacter && sceneCharacter.children.length
    useEffect(() => {
      setCharacterChildrenLength(length)
    }, [length])
  
    useMemo(() => {
      if(!prevModelName.current) {
        setAllowToInitialize(true)
     
      } else {
        let isCurrentModelUser = isUserModel(character.model)
        let isPrevModelUser = isUserModel(prevModelName.current)
        if((!isPrevModelUser && isCurrentModelUser) || 
           (isPrevModelUser && !isCurrentModelUser) ||
           (isPrevModelUser && isCurrentModelUser)) {
          setAllowToInitialize(false)
        } else {
          setAllowToInitialize(true)
        }
      }
      prevModelName.current = character.model
    }, [character.model])

    useEffect(() => {
      isAttachableSelected.current = false
      return () => {
        if(!characterObject.current || !ref.current.parent) return
        ref.current.parent.remove(ref.current)
      }
    }, [])

    useEffect(() => {  
      if(!(characterChildrenLength > 0)) return
      let object = scene.__interaction.filter(o => o.userData.id === sceneObject.attachToId)[0]
      let lod = object.getObjectByProperty("type", "LOD")
      setCharacterLOD(lod)
    }, [characterChildrenLength])

    useEffect(() => {
      if(!characterObject.current || !isAllowedToInitialize) return
      rebindAttachable()
    }, [characterModel, characterLOD])    

    useEffect(() => {
      if(!ref.current || !characterObject.current ) return
      rebindAttachable()
    }, [sceneObject.bindBone])

    useEffect(() => {
      if(!ref.current) return 
      let index = scene.__interaction.indexOf(ref.current)
      if (index === -1) scene.__interaction.push(ref.current) 
    }, [characterModel])

    useEffect(() => {
      if(!characterModel || !characterLOD || !isAllowedToInitialize || characterObject.current) return 
      characterObject.current = scene.children[0].children.filter(o => o.userData.id === sceneObject.attachToId)[0]
      if(!characterObject.current) return
      let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
      let bone = skinnedMesh.skeleton.bones.find(b => b.name === sceneObject.bindBone)
      if(sceneObject.status === "PENDING") {
        let modelPosition = new THREE.Vector3()
        let quat = null
        if(isUserModel(sceneObject.model)) {
          modelPosition.copy(bone.worldPosition())
          quat = bone.worldQuaternion()
        } else {
          let {x, y, z} = sceneObject
          modelPosition.set(x, y, z)
          let newGroup = new THREE.Object3D()
          newGroup.rotation.set(sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z)
          newGroup.position.copy(modelPosition)
          newGroup.scale.copy(ref.current.scale)
          bone.add(newGroup)
          bone.updateWorldMatrix(true, true)
          let scale = getProperCharacterScale()
          newGroup.position.multiplyScalar(scale)
          newGroup.updateMatrixWorld(true)
          modelPosition = newGroup.worldPosition()
          quat = newGroup.worldQuaternion()
          bone.remove(newGroup)
          originalPosition.current = modelPosition
        }
        let euler = new THREE.Euler().setFromQuaternion(quat)
      }
      bone.add(ref.current)

      originalPosition.current = originalPosition.current || new THREE.Vector3(sceneObject.x, sceneObject.y, sceneObject.z)
      originalHeight.current = character.height

      ref.current.updateMatrixWorld(true)
      ref.current.updateWorldMatrix(true, true)
    }, [characterLOD, isAllowedToInitialize])
  
    useEffect(() => {
      if (!meshes || meshes.length === 0) return
      
      for (let mesh of meshes) {
        setSelected(mesh.props.object, isSelected)
      }
    }, [meshes, isSelected])
    
    useEffect(() => {
      if(!characterObject.current || !ref.current.parent) return
      // 1.8 is height of default character for which attachable was placed
      let scale = getProperCharacterScale()
      ref.current.scale.set(scale, scale, scale)
      ref.current.updateMatrixWorld(true)
    }, [sceneObject.size, characterLOD])

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
      recalculateOffset()
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

    const rebindAttachable = () => {
      characterObject.current = scene.__interaction.filter(child => child.userData.id === sceneObject.attachToId)[0]
      if(!characterObject.current ) return
      
      let skinnedMesh = characterObject.current.getObjectByProperty("type", "SkinnedMesh")
      if(!skinnedMesh) return
      let skeleton = skinnedMesh.skeleton
      let bone = skeleton.getBoneByName(sceneObject.bindBone)
      bone.add(ref.current)
      
      ref.current.updateWorldMatrix(true, true)

      let currentOffset = getOffsetBetweenCharacterAndAttachable()

      let offsetDifference = currentOffset.sub(offsetToCharacter.current)
      ref.current.parent.localToWorld( ref.current.position)
      ref.current.position.add(offsetDifference)
      ref.current.parent.worldToLocal( ref.current.position)

      // 1.8 is height of default character for which attachable was placed
      let scale = getProperCharacterScale()
      ref.current.scale.set(scale, scale, scale)
      ref.current.updateMatrixWorld(true)
    }

    const getProperCharacterScale = () => {
      let scale = sceneObject.size * (character.height / 1.8)
      if(character.model === "baby") {
        scale = 1 - (1 - scale) / 1.25
      }
      if(character.model === "child") {
        scale = 1 - (1 - scale) / 1.75
      }
      return scale
    }

    const recalculateOffset = () => {
      let offset = getOffsetBetweenCharacterAndAttachable()
      offsetToCharacter.current = !offsetToCharacter.current ? 
                                  offset.clone() :
                                  offsetToCharacter.current.set(offset.x, offset.y, offset.z)
    }

    let vector = new THREE.Vector3()
    const getOffsetBetweenCharacterAndAttachable = () => {
      ref.current.parent.updateMatrixWorld(true)
      ref.current.updateMatrixWorld(true)
      let characterWorldPos = new THREE.Vector3().setFromMatrixPosition(ref.current.parent.matrixWorld)
      let attachablesWorldPos = new THREE.Vector3().setFromMatrixPosition(ref.current.matrixWorld)
      vector.set(characterWorldPos.x - attachablesWorldPos.x, characterWorldPos.y - attachablesWorldPos.y, characterWorldPos.z - attachablesWorldPos.z)
      return vector
    }

    return <group
        ref={ ref }

        onController={ () => null }
        userData={{
          type: "attachable",
          id: sceneObject.id,
          bindedId: sceneObject.attachToId,
          isRotationEnabled: false,
        }}
        >
          {meshes}
    </group>
})

export default Attachable
