import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useUpdate } from 'react-three-fiber'
import onlyOfTypes from './../../utils/only-of-types'
import { SHOT_LAYERS } from '../../utils/ShotLayers'

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  flatShading: false
})

const Environment = React.memo(({ gltf, environment }) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(SHOT_LAYERS))
    }
  )

  const group = useMemo(() => {
    if (!gltf) return null

    let group = new THREE.Group()

    let sceneData = onlyOfTypes(gltf.scene, ['Scene', 'Meh', 'Group'])
s
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

    group.add(...sceneData.children)

    return group
  }, [gltf])

  const { x, y, z, visible, rotation, scale } = environment

  return <primitive
    ref={ ref }

    userData={{
      type: "environment"
    }}

    object={ group }

    visible={ visible }

    position={ [x, z, y] }
    scale={ [scale, scale, scale] }
    rotation-y={ [rotation] }
  >
  </primitive>
})

export default Environment
