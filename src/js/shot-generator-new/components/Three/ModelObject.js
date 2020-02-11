import * as THREE from 'three'
import React, { useMemo, useEffect } from 'react'
import { useUpdate, extend } from 'react-three-fiber'

import traverseMeshMaterials from '../../helpers/traverse-mesh-materials'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import {MeshToonMaterial} from "three"

import RoundedBoxGeometryCreator from 'three-rounded-box'
import {patchMaterial, setSelected} from "../../helpers/outlineMaterial"
const RoundedBoxGeometry = RoundedBoxGeometryCreator(THREE)

extend({RoundedBoxGeometry})

const materialFactory = () => patchMaterial(new MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  reflectivity: 0x0,
  skinning: false,
  shininess: 0,
  flatShading: false,
  morphNormals: false,
  morphTargets: false
}))

const meshFactory = source => {
  let mesh = source.clone()

  let material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const ModelObject = React.memo(({ gltf, sceneObject, isSelected, ...props }) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(SHOT_LAYERS))
    }
  )

  const meshes = useMemo(() => {
    if (sceneObject.model === 'box') {
      return [
        <mesh key={sceneObject.id}>
          <roundedBoxGeometry
            ref={ref => ref && ref.translate(0, 0.5, 0)}
            attach='geometry'
            args={[1, 1, 1, 0.015]} />
          <primitive
            attach='material'
            object={materialFactory()} />
        </mesh>
      ]
    }

    if (gltf) {
      let children = []
      gltf.scene.traverse(child => {
        if (child.isMesh) {
          children.push(
            <primitive
              key={`${sceneObject.id}-${child.uuid}`}
              object={meshFactory(child)}
            />
          )
        }
      })
      return children
    }

    return []
  }, [sceneObject.model, gltf])

  useEffect(() => {
    traverseMeshMaterials(ref.current, material => {
      if (material.emissive) {
        material.emissive = new THREE.Color( sceneObject.tintColor || '#000000' )
      }
    })
  }, [ref.current, sceneObject.tintColor])

  useEffect(() => {
    ref.current.traverse((child) => {
      if (child.isMesh) {
        setSelected(child, isSelected)
      }
    })
  }, [ref.current, isSelected, gltf])

  const { x, y, z, visible, width, height, depth, rotation, locked } = sceneObject

  return <group
    ref={ref}

    onController={ sceneObject.visible ? () => null : null} 
    userData={{
      type: 'object',
      id: sceneObject.id,
      locked: locked
    }}

    visible={ visible }
    position={ [x, z, y] }
    scale={ [width, height, depth] }
    rotation={ [rotation.x, rotation.y, rotation.z] }
    {...props}
  >
    {meshes}
  </group>
})

export default ModelObject
