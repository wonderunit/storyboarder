import * as THREE from 'three'
import React, { useMemo, useEffect } from 'react'
import { useUpdate } from 'react-three-fiber'


const ModelObject = React.memo(({ gltf, sceneObject, children }) => {
  const ref = useUpdate(
    self => {
      //self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )



  const { x, y, z, visible, width, height, depth, rotation } = sceneObject

  return <group
    ref={ref}

    onController={sceneObject.visible ? () => null : null}
    userData={{
      type: 'object',
      id: sceneObject.id
    }}

    visible={visible}
    position={[x, z, y]}
    scale={[width, height, depth]}
    rotation={[rotation.x, rotation.y, rotation.z]}
  >
    {meshes}
  </group>
})

export default ModelObject
