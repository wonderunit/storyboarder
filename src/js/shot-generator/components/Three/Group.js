import * as THREE from 'three'

import React, { useRef, useEffect, useMemo } from 'react'
import { batch } from 'react-redux'
import { useThree } from 'react-three-fiber'
import ObjectRotationControl from '../../../shared/IK/objects/ObjectRotationControl'
import { axis } from "../../../shared/IK/utils/TransformControls"

const Group = React.memo(({ id, type, ...props }) => {
  const ref = useRef()
 // const group = useRef(new THREE.Group())
  const { scene, camera, gl } = useThree()
  const objectRotationControl = useRef()
  useEffect(() => {
    objectRotationControl.current = new ObjectRotationControl(scene.children[0], camera, gl.domElement, 1, axis.Y_axis )
    objectRotationControl.current.control.canSwitch = false
    objectRotationControl.current.isEnabled = true
    return () => {
     // addArrayToObject(scene.children[0], children, false) 
      if(objectRotationControl.current) {
        objectRotationControl.current.cleanUp()
        objectRotationControl.current = null
      } 
    }
  }, [])

  const children = useMemo(() => {
    return scene.__interaction.filter((object) => props.children.includes(object.userData.id))
  }, [props.children])

  const addArrayToObject = (object, array, isAttach = true) => {
    console.log("Container", object)
    for(let i = 0; i < array.length; i++) {
      if(isAttach) object.attach(array[i])
      else object.add(array[i])
    }
  } 

  const updateAllChildren = () => {
    props.withState((dispatch, state) => {
      batch(() => {
        for(let i = 0; i < children.length; i++) {
          let child = children[i]
          let state = {}
          let euler = new THREE.Euler()
          switch(child.userData.type) {
            case "character":
             // let quaternion = child.quaternion.clone().multiply(ref.current.quaternion)
              euler.setFromQuaternion(child.worldQuaternion(), "YXZ")
              state.rotation = euler.y
              break;
              case "image":
              case "object":
              euler.setFromQuaternion(child.worldQuaternion())
              state.rotation = { x : euler.x, y : euler.y, z : euler.z }
              state.position = child.worldPosition()
              break;
            case "light":
              euler.setFromQuaternion(child.worldQuaternion(), "YXZ")
              state = {
                rotation: euler.y,
                tilt: euler.x,
                roll: euler.z
              }
              state.position = child.worldPosition()
              break;
          }
          let position = child.worldPosition()
          state.x = position.x 
          state.y = position.z
          state.z = position.y
          dispatch(props.updateObject(child.userData.id, state))

          if(child.userData.type === "character") {
            let attachables = scene.__interaction.filter(object => object.userData.bindedId === child.userData.id)
            for(let i = 0; i < attachables.length; i ++) {
                let attachable = attachables[i]
                attachable.parent.updateWorldMatrix(true, true)
                let position = attachable.worldPosition()// new THREE.Vector3()
                let quaternion = attachable.worldQuaternion()
                let matrix = attachable.matrix.clone()
                matrix.premultiply(attachable.parent.matrixWorld)
                matrix.decompose(position, quaternion, new THREE.Vector3())
                let rot = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ')
                dispatch(props.updateObject(attachable.userData.id, 
                { 
                    x: position.x, y: position.y, z: position.z,
                    rotation: { x: rot.x, y: rot.y, z: rot.z },
                }))
            }
          }
        }   
      })
    })
  }

  const getCenterPosition = () => {
    let center = new THREE.Vector3()
    for(let i = 0; i < children.length; i++) {
      let child = children[i]
      center.add(child.position)
    }
    center.divideScalar(children.length)
    return center
  }

  useEffect(() => {
    if (props.isSelected) {

      objectRotationControl.current.setUpdateCharacter((name, rotation) => {
        updateAllChildren()
      })
      ref.current.position.copy(getCenterPosition())
      ref.current.updateMatrixWorld(true)
      objectRotationControl.current.setCharacterId(ref.current.uuid)
      objectRotationControl.current.selectObject(ref.current, ref.current.uuid)
      objectRotationControl.current.IsEnabled = !props.locked
      objectRotationControl.current.customOnMouseDownAction = () => { addArrayToObject(ref.current, children) };
      objectRotationControl.current.customOnMouseUpAction = () => { addArrayToObject(scene.children[0], children, false) };

    } else {
      objectRotationControl.current.deselectObject()
    }
  }, [props.isSelected])

  return <group
  ref={ ref }
  userData={{ 
    id: id,
    type: type,
    children: props.children
  }}
  />

})
 
export default Group
