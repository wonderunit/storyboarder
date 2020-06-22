import React from 'react'
import {connect} from 'react-redux'

import {getSceneObjects} from "../../../../shared/reducers/shot-generator"
import {useAsset} from "../../../../shot-generator/hooks/use-assets-manager"
import useGLTFAsset from "../../hooks/useGLTFAsset"
import {useUpdate} from "react-three-fiber"

const materialFactory = () => new THREE.MeshBasicMaterial({
  color: 0x8c78f1,
  flatShading: false
})

const VirtualCamera = ({sceneObject}) => {
  const {asset} = useAsset('/data/system/xr/virtual-camera.glb')
  let object = useGLTFAsset(asset ? asset.scene : null, materialFactory)

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
        id: sceneObject.id,
        locked
      }}
    />
  )
}

const mapStateToProps = (state, ownProps) => {
  const sceneObject = getSceneObjects(state)[ownProps.id]

  return {
    sceneObject
  }
}

export default connect(mapStateToProps)(VirtualCamera)
