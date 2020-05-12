import * as THREE from 'three'
import React, { useMemo, useEffect, useRef } from 'react'
import { useUpdate } from 'react-three-fiber'

import { useAsset } from "../../hooks/use-assets-manager"

import { SHOT_LAYERS } from '../../utils/ShotLayers'
import { patchMaterial, setSelected } from "../../helpers/outlineMaterial"
import path from "path"

import tweenObjectMatrix from "../../../shared/helpers/tweenObjectMatrix"

const materialFactory = () => patchMaterial(new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  skinning: false,
  shininess: 0,
  flatShading: false,
  morphNormals: false,
  morphTargets: false
}), {
  thickness: 0.008
})

const meshFactory = (source) => {
  let mesh = source.clone()

  let material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const XRClient = React.memo((props) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.disable(SHOT_LAYERS))
    }
  )
  
  const hmdRef = useRef(null)
  const leftControllerRef = useRef(null)
  const rightControllerRef = useRef(null)

  const {asset: helmet} = useAsset(path.join(window.__dirname, 'data', 'shot-generator', 'xr', 'hmd.glb'))
  const {asset: controller} = useAsset(path.join(window.__dirname, 'data', 'shot-generator', 'xr', 'controller.glb'))

  const meshes = useMemo(() => {
    const result = {
      helmet: [],
      controller: [[], []]
    }

    if (!helmet || !controller) {
      return result
    }

    result.helmet = helmet.scene.children.map((child) => (
      <primitive
        key={`${props.id}-helmet-${child.uuid}`}
        object={meshFactory(child)}
        rotation={[0.0, Math.PI, 0.0]}
      />
    ))

    result.controller[0] = controller.scene.children.map((child) => (
      <primitive
        key={`${props.id}-controller-${child.uuid}`}
        object={meshFactory(child)}
      />
    ))

    result.controller[1] = controller.scene.children.map((child) => (
      <primitive
        key={`${props.id}-controller-${child.uuid}`}
        object={meshFactory(child)}
      />
    ))
    
    return result
  }, [helmet, controller])

  useEffect(() => {
    ref.current.traverse((child) => {
      if (child.isMesh) {
        setSelected(child, false)
      }
    })
  }, [ref.current])
  
  let controllersValue = (props.controllers.length === 2) ? [...props.controllers[0], ...props.controllers[1]] : props.controllers.length

  useEffect(() => {
    if (!hmdRef.current || !leftControllerRef.current || !rightControllerRef.current || props.controllers.length === 0) {
      return
    }
    
    const cancelHelmetTween = tweenObjectMatrix(hmdRef.current, props.matrix)
    const cancelLControllerTween = tweenObjectMatrix(leftControllerRef.current, props.controllers[0])
    const cancelRControllerTween = tweenObjectMatrix(rightControllerRef.current, props.controllers[1])
    
    return () => {
      cancelHelmetTween()
      cancelLControllerTween()
      cancelRControllerTween()
    }
  }, [hmdRef.current, leftControllerRef.current, rightControllerRef.current, ...props.matrix, controllersValue])

  return <group
    ref={ref}

    onController={() => null}
    userData={{
      type: 'remote-client',
      id: props.id,
      locked: true
    }}

    visible={ props.active }
    scale={ [1.0, 1.0, 1.0] }
  >
    <group ref={hmdRef}>{meshes.helmet}</group>
    <group ref={leftControllerRef}>{meshes.controller[0]}</group>
    <group ref={rightControllerRef}>{meshes.controller[1]}</group>
  </group>
})

export default XRClient
