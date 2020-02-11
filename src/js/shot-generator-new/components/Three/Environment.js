import * as THREE from 'three'
import React, { useMemo, useEffect, useRef } from 'react'
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
  const {asset: gltf, loaded} = useAsset(path)
  const group = useRef(new THREE.Group())
  
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(SHOT_LAYERS))
    }
  )

  useEffect(() => {
    if (!gltf) return

    let sceneData = onlyOfTypes(gltf.scene, ['Scene', 'Mesh', 'Group'])
    sceneData.traverse(child => {
      if (child.isMesh) {
        let material = materialFactory()

        if (child.material.map) {
          material.map = child.material.map
          material.map.needsUpdate = true
        }

        child.material = material
      }
    })

    group.current.add(...sceneData.children)

    return () => {
      while (group.current.children.length > 0) {
        group.current.remove(group.current.children[0])
      }
    }
  }, [gltf])

  const { x, y, z, visible, rotation, scale } = environment

  return <primitive
    ref={ ref }

    userData={{
      type: "environment"
    }}

    object={ group.current }

    visible={ visible }

    position={ [x, z, y] }
    scale={ [scale, scale, scale] }
    rotation-y={ [rotation] }
  >
  </primitive>
})

export default Environment
