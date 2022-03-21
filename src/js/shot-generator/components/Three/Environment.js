import * as THREE from 'three'
import React, { useMemo, useEffect } from 'react'
import {useAsset} from "../../hooks/use-assets-manager"
import {useUpdate} from 'react-three-fiber'
import onlyOfTypes from './../../utils/only-of-types'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import { MathUtils } from 'three'

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0
})

const meshFactory = (source) => {

  const mesh = source.clone()
  const material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.flatShading = mesh.material.flatShading
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const traverseFcn = (object3d) => {

  if (!object3d) return []

  const children = []

  if (object3d.isBufferGeometry){
    children.push(
      <primitive
        key={`${new MathUtils.generateUUID()}`}
        object={ new THREE.Mesh(object3d,materialFactory()) }
      />
    )
    return children
  }

  const sceneData = onlyOfTypes(object3d.scene ? object3d.scene : object3d, ['Scene', 'Mesh', 'Group'])

  sceneData.traverse(child => {
    if (child.isMesh) {
      const mesh = meshFactory(child)
      children.push( 
        <primitive
          key={`${mesh.uuid}`}
          object={mesh}
        />
      )
    }
  })

  return children
}

const Environment = React.memo(({ path, environment, grayscale }) => {
  const { asset } = useAsset(path)
  
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(SHOT_LAYERS))
    }
  )
  const meshes = useMemo(() => traverseFcn(asset), [asset])
  
  useEffect(() => {
    for(let i = 0; i < meshes.length; i++) {
      let material = meshes[i].props.object.material
      material.defines.GRAYSCALE = grayscale
      material.needsUpdate = true
    }
  }, [grayscale, asset])

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
