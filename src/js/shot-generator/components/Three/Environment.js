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
      self.traverse(child => child.layers.enable(SHOT_LAYERS))
    }
  )
  const meshes = useMemo(() => {
    if (!gltf) return []
    let children = []
    let sceneData = onlyOfTypes(gltf.scene, ['Scene', 'Mesh', 'Group'])
    sceneData.traverse(child => {
      if (child.isMesh) {
        let mesh = child.clone()
        let material = materialFactory()

        if (mesh.material.map) {
          material.map = mesh.material.map
          material.map.needsUpdate = true
        }

        mesh.material = material
        children.push( <primitive
          key={`${mesh.uuid}`}
          object={mesh}
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
