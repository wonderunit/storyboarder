import * as THREE from 'three'
import React, { useMemo, useEffect, useState, useRef } from 'react'

import { useUpdate, useThree } from 'react-three-fiber'
import { useAsset } from '../../hooks/use-assets-manager'

import path from 'path'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import ObjectRotationControl from '../../../shared/IK/objects/ObjectRotationControl'

const Light = React.memo(({sceneObject, isSelected, children, ...props }) => {
  const {asset: gltf} = useAsset(path.join(window.__dirname, 'data', 'shot-generator', 'xr', 'light.glb'))
  const mesh = useMemo(() => gltf ? gltf.scene.children[0].clone() : null, [gltf])
  const [lightColor, setLightColor] = useState(0x8c78f1)
  const { scene, camera, gl } = useThree()
  const objectRotationControl = useRef()

  useEffect(() => {
    objectRotationControl.current = new ObjectRotationControl(scene.children[0], camera, gl.domElement, ref.current.uuid)
    objectRotationControl.current.control.canSwitch = false
    objectRotationControl.current.isEnabled = true
    objectRotationControl.current.setUpdateCharacter((name, rotation) => {
      let euler = new THREE.Euler().setFromQuaternion(ref.current.worldQuaternion(), "YXZ")
      props.updateObject(ref.current.userData.id, {
        rotation: euler.y,
        tilt: euler.x,
        roll: euler.z
      } )})
      return () => {
        if(objectRotationControl.current) {
          objectRotationControl.current.deselectObject()
          objectRotationControl.current = null
        }
      }
  }, [])

  useEffect(() => {
    if(!objectRotationControl.current) return
    objectRotationControl.current.setCamera(camera)
  }, [camera])

  const ref = useUpdate(self => {
    self.rotation.x = 0
    self.rotation.z = 0
    self.rotation.y = sceneObject.rotation || 0
    self.rotateX(sceneObject.tilt || 0)
    self.rotateZ(sceneObject.roll || 0)
  }, [sceneObject.rotation, sceneObject.tilt, sceneObject.roll])

  const spotLight = useUpdate(
    self => {
      self.target.position.set(0, 0, sceneObject.distance)
      self.add(self.target)
      self.layers.enable(SHOT_LAYERS)
  }, [sceneObject.distance])
  
  useEffect(() => {
    if (isSelected) {
      setLightColor(0x7256ff)
      objectRotationControl.current.selectObject(ref.current, sceneObject.id)
    } else {
      setLightColor(0x8c78f1)
      objectRotationControl.current.deselectObject()
    }
  }, [isSelected]) 

  const { x, y, z, visible, locked } = sceneObject
  return <group
      ref={ ref }
      onController={ visible ? () => null : null }
      visible={ visible }
      userData={{
        id: sceneObject.id,
        type: "light",
        locked: locked
      }}
      position={ [x, z, y] }
    >
      { mesh && <primitive
        object={ mesh } 
        rotation={[-Math.PI/2, Math.PI, 0]}
        userData={{ 
          type: "light",
        }}
      >
        <meshBasicMaterial
          attach="material"
          color={ lightColor }
          flatShading={false}
        />
      </primitive> }

      <spotLight
        ref={ spotLight }
        color={ 0xffffff }
        intensity={ sceneObject.intensity} 
        position={ [0, 0, 0] }
        rotation={ [Math.PI / 2, 0, 0] }
        angle={ sceneObject.angle }
        distance={ sceneObject.distance }
        penumbra={ sceneObject.penumbra }
        decay={ sceneObject.decay }
      />

      {children}
    </group>
})

export default Light
