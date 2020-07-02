import React, {useMemo, useEffect} from 'react'
import {connect} from 'react-redux'

import {getSceneObjects, getSelections} from "../../../../shared/reducers/shot-generator"
import {useAsset} from "../../../../shot-generator/hooks/use-assets-manager"
import useGLTFAsset from "../../hooks/useGLTFAsset"
import {useUpdate} from "react-three-fiber"
import traverseMeshMaterials from "../../../../shot-generator/helpers/traverse-mesh-materials"

const materialFactory = () => new THREE.MeshBasicMaterial({
  color: 0x8c78f1,
  flatShading: false
})

const VirtualCamera = ({sceneObject, isSelected}) => {
  const {asset} = useAsset('/data/system/xr/virtual-camera.glb')
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

  const { x, y, z, visible, locked } = sceneObject

  return (
    <primitive
      ref={ref}
      object={object}

      visible={visible}

      position={[x, z, y]}

      userData={{
        isSelectable: true,
        type: 'camera',
        id: sceneObject.id,
        locked
      }}
    />
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

export default connect(mapStateToProps)(VirtualCamera)
