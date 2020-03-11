import * as THREE from 'three'
import React, { useEffect, useRef, useMemo } from 'react'
import {useAsset} from "../../hooks/use-assets-manager"
import {useUpdate} from 'react-three-fiber'
import onlyOfTypes from './../../utils/only-of-types'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import {patchMaterial} from "../../helpers/outlineMaterial"

const materialFactory = () => patchMaterial(new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  flatShading: false
}))

const Environment = React.memo(({ path, environment }) => {
  const {asset: gltf} = useAsset(path)
  
  const ref = useUpdate(
    self => {
      console.log(self)
      self.traverse(child => child.layers.enable(SHOT_LAYERS))
    }
  )

  const meshes = useMemo(() => {
    if (!gltf) return []
    let children = []
    let sceneData = onlyOfTypes(gltf.scene, ['Scene', 'Mesh', 'Group'])
    sceneData.traverse(child => {
      if (child.isMesh) {
        let material = materialFactory()

        if (child.material.map) {
          material.map = child.material.map
          material.map.needsUpdate = true
        }

        child.material = material
        children.push( <primitive
          key={`${child.uuid}`}
          object={child}
        />)
      }
    })
    return children

  }, [gltf])

  const { x, y, z, visible, rotation, scale } = environment

  return <group
    ref={ ref }

    userData={{
      type: "environment"
    }}

    visible={ visible }

    position={ [x, z, y] }
    scale={ [scale, scale, scale] }
    rotation-y={ [rotation] }
  >
     {meshes}
  </group>
})

export default Environment
