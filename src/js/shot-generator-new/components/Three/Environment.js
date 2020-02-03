import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'

import onlyOfTypes from './../../utils/only-of-types'
import {useAsset} from "../../hooks/use-assets-manager"

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  flatShading: false
})

const Environment = React.memo(({ path, environment }) => {
  const ref = useRef()
  
  const {asset} = useAsset(path)
  const group = useRef(new THREE.Group())

  useEffect(() => {
    if (!asset) return 
    
    const sceneData = onlyOfTypes(asset.scene, ['Scene', 'Mesh', 'Group'])

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
  }, [Boolean(asset), path])

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
