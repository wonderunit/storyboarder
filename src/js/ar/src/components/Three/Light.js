import React, {useMemo, useEffect} from 'react'
import {connect} from 'react-redux'
import {useUpdate} from 'react-three-fiber'

import {getSceneObjects, getSelections} from "../../../../shared/reducers/shot-generator"

import {useAsset} from "../../../../shot-generator/hooks/use-assets-manager"
import useGLTFAsset from "../../hooks/useGLTFAsset"
import traverseMeshMaterials from "../../../../shot-generator/helpers/traverse-mesh-materials"

const materialFactory = () => new THREE.MeshBasicMaterial({
  color: 0x8c78f1,
  flatShading: false
})

const Light = ({sceneObject, isSelected}) => {
  const {asset} = useAsset('/data/system/xr/light.glb')
  let object = useGLTFAsset(asset ? asset.scene : null, materialFactory)
  
  const lightColor = useMemo(() => {
    if (isSelected) {
      return 0x7256ff
    }
    
    return 0x8c78f1
  }, [isSelected])
  
  useEffect(() => {
    if (object) {
      traverseMeshMaterials(object, material => {
        material.color = new THREE.Color(lightColor)
      })
    }
  }, [lightColor, object])

  const ref = useUpdate(self => {
    self.rotation.x = 0
    self.rotation.z = 0
    self.rotation.y = sceneObject.rotation || 0
    self.rotateX(sceneObject.tilt || 0)
    self.rotateZ(sceneObject.roll || 0)
  }, [sceneObject.rotation, sceneObject.tilt, sceneObject.roll])

  const spotLightRef = useUpdate(
    self => {
      self.target.position.set(0, 0, sceneObject.distance)
      self.add(self.target)
    },
    [sceneObject.distance]
  )

  const { x, y, z, visible, intensity, angle, distance, penumbra, decay, locked } = sceneObject
  
  return (
    <group
      ref={ref}
      object={object}
      visible={visible}

      position={[x, z, y]}

      userData={{
        isSelectable: true,
        type: 'light',
        id: sceneObject.id,
        locked
      }}
    >
      <primitive
        object={object}
        rotation={[-Math.PI/2, Math.PI, 0]}
      />

      <spotLight
        ref={spotLightRef}
        color={0xffffff}
        intensity={intensity}
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        angle={angle}
        distance={distance}
        penumbra={penumbra}
        decay={decay}
      />
    </group>
  )
}

const mapStateToProps = (state, ownProps) => {
  const sceneObject = getSceneObjects(state)[ownProps.id]
  const isSelected = getSelections(state).includes(ownProps.id)
  
  return {
    sceneObject,
    isSelected
  }
}
  


export default connect(mapStateToProps)(Light)
