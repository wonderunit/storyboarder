import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useUpdate } from 'react-three-fiber'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import {patchMaterial, setSelected} from "../../helpers/outlineMaterial";

const Image = React.memo(({ sceneObject, isSelected, texture }) => {
  const aspect = useRef(1)
  const ref = useRef()

  const material = useMemo(() => {
    return patchMaterial(new THREE.MeshToonMaterial({ transparent: true }))
  }, [])

  useMemo(() => {
    if(!texture) return
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.offset.set(0, 0)
    texture.repeat.set(1, 1)

    const { width, height } = texture.image
    aspect.current = width / height

    if (material) {
        material.map = texture
        material.needsUpdate = true
    } 
  }, [texture])

  useEffect(() => {
    setSelected(material, isSelected)
  }, [ref.current, isSelected])

  useEffect(() => {
    material.opacity = sceneObject.opacity
  }, [sceneObject.opacity])

  useEffect(() => {
    if (sceneObject.visibleToCam) ref.current.traverse(child => child.layers.enable(SHOT_LAYERS))
    else ref.current.traverse(child => child.layers.disable(SHOT_LAYERS))
  }, [ref.current, sceneObject.visibleToCam])

  const { x, y, z, visible, height, rotation, locked } = sceneObject
  return (
    <group
      ref={ ref }
      onController={ sceneObject.visible ? () => null : null }
      userData={{
        type: "image",
        id: sceneObject.id,
        locked: locked
      }}
      visible={ visible }
      position={ [x, z, y] }
      scale={ [height * aspect.current, height, 1] }
      rotation={ [rotation.x, rotation.y, rotation.z] }
    >
      <mesh
        userData={{
            type: "image",
            id: sceneObject.id
        }}
      >
        <planeBufferGeometry attach="geometry" args={ [1, 1] } />
        <primitive attach="material" object={ material } />
      </mesh>
      <mesh 
        userData={{
            type: "image",
            id: sceneObject.id
        }}
        rotation={ [0, Math.PI, 0] } 
        scale={ [-1, 1, 1] }>
        <planeBufferGeometry attach="geometry" args={ [1, 1, 0.01] } />
        <primitive attach="material" object={ material } />
      </mesh>
    </group>
  )
})

export default Image
