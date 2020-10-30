import React, { useMemo, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useUpdate, useThree } from 'react-three-fiber'
import {useAsset} from '../../hooks/use-assets-manager'
import {SHOT_LAYERS} from '../../utils/ShotLayers'
import isUserModel from '../../helpers/isUserModel'
import KeyCommandsSingleton from '../KeyHandler/KeyCommandsSingleton'
import ObjectRotationControl from '../../../shared/IK/objects/ObjectRotationControl'
import {patchMaterial, setSelected} from "../../helpers/outlineMaterial";

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
  let mesh = source.isSkinnedMesh ? THREE.SkeletonUtils.clone(source) : source.clone()

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

const Attachable = React.memo(({ path, sceneObject, isSelected, updateObject, сharacterModelPath, deleteObjects, character, withState }) => {
    const {asset: gltf} = useAsset(path)
    const {asset: characterModel} = useAsset(сharacterModelPath)
    const [characterLOD, setCharacterLOD] = useState()
    const characterObject = useRef(null)
    const prevModelName = useRef(null)
    const isAttachableSelected = useRef(null)
    const objectRotationControl = useRef(null)
    const { gl, scene, camera } = useThree()
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
          deleteObjects([sceneObject.id])
        } else {
          setAllowToInitialize(true)
        }
      }
      prevModelName.current = character.model
    }, [character.model])

    useEffect(() => {
      isAttachableSelected.current = false
      return () => {
        if(objectRotationControl.current) {
          objectRotationControl.current.cleanUp();
          objectRotationControl.current = null
        }
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
        if (
          // a non-hair custom model
          isUserModel(sceneObject.model) &&
          !(sceneObject.attachableType === 'hair' && sceneObject.bindBone === 'Head')
        ) {
          modelPosition.copy(bone.worldPosition())
          quat = bone.worldQuaternion()
        } else {
          // built-in system models, or custom models with hair
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
        updateObject(sceneObject.id, {
          x: modelPosition.x, y: modelPosition.y, z: modelPosition.z,
          rotation: { x: euler.x, y: euler.y, z: euler.z },
          status: "Loaded"
        })
      }
      bone.add(ref.current)
      // Sets up object rotation control for manipulation of attachale rotation
      objectRotationControl.current = new ObjectRotationControl(scene.children[0], camera, gl.domElement, characterObject.current.uuid)
      objectRotationControl.current.control.canSwitch = false
      objectRotationControl.current.setUpdateCharacter((name, rotation) => {
        let euler = new THREE.Euler().setFromQuaternion(ref.current.worldQuaternion())
        updateObject(ref.current.userData.id, {
          rotation:
          {
            x : euler.x,
            y : euler.y,
            z : euler.z,
          }
        } )})

      originalPosition.current = originalPosition.current || new THREE.Vector3(sceneObject.x, sceneObject.y, sceneObject.z)
      originalHeight.current = character.height

      ref.current.updateMatrixWorld(true)
      ref.current.updateWorldMatrix(true, true)
    }, [characterLOD, isAllowedToInitialize])

    useEffect(() => {
      if(!ref.current || !objectRotationControl.current) return
      if(isSelected) {
        KeyCommandsSingleton.getInstance().addKeyCommand({
          key: "Switch attachables to rotation", 
          value: switchManipulationState,
          keyCustomCheck: controlPlusRCheck
        })
        if(!isAttachableSelected.current) {
          if(objectRotationControl.current.isEnabled) { 
            objectRotationControl.current.selectObject(ref.current, sceneObject.id)
          }
          isAttachableSelected.current = true
        }
      }
      else {
        if(isAttachableSelected.current) {
          objectRotationControl.current.deselectObject()
          isAttachableSelected.current = false
        }
      }
      return function cleanup () {
        KeyCommandsSingleton.getInstance().removeKeyCommand({key: "Switch attachables to rotation"})
      }
    }, [isSelected])
  
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
      saveToStore()
    }

    useEffect(() => {
      if(!characterObject.current || !ref.current || !characterLOD || !ref.current.parent) return
      characterObject.current.updateWorldMatrix(false, true)
      saveToStore()
    }, [character.rotation, character.height, character.posePresetId, character.handPosePresetId])

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

    const saveToStore = () => {
      withState((dispatch, state) => {
        let type = state.lastAction.type
        if(type.includes("UNDO") || type.includes("REDO"))
          return;
      })
      let position = ref.current.worldPosition()// new THREE.Vector3()
      let quaternion = ref.current.worldQuaternion()
      let matrix = ref.current.matrix.clone()
      matrix.premultiply(ref.current.parent.matrixWorld)
      matrix.decompose(position, quaternion, new THREE.Vector3())
      let rot = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ')
      updateObject(sceneObject.id, 
      { 
          x: position.x, y: position.y, z: position.z,
          rotation: { x: rot.x, y: rot.y, z: rot.z },
      })
    }

    const controlPlusRCheck = (event) => {
      event.stopPropagation()
      if(event.ctrlKey && event.key === 'e'){
        event.stopPropagation()
        return true
      } 
    }

    useEffect(() => {
      if(!objectRotationControl.current) return
      objectRotationControl.current.setCamera(camera)
    }, [camera])

    const switchManipulationState = () => {
      let isRotation = !ref.current.userData.isRotationEnabled
      ref.current.userData.isRotationEnabled = isRotation
      if(isRotation) {
        objectRotationControl.current.selectObject(ref.current, sceneObject.id)
        objectRotationControl.current.isEnabled = true
      } else {
        objectRotationControl.current.deselectObject()
        objectRotationControl.current.isEnabled = false
      }
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
