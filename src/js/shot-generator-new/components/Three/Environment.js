import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'

import onlyOfTypes from './../../utils/only-of-types'

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  flatShading: false
})

const Environment = React.memo(({ gltf, environment }) => {
  const ref = useRef()

  const group = useMemo(() => {
    if (!gltf) return null

    let group = new THREE.Group()

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
