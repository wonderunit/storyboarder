import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import {useAsset, cache} from "../../hooks/use-assets-manager"
import { SHOT_LAYERS } from '../../utils/ShotLayers'

const Image = React.memo(({ sceneObject, isSelected, imagesPaths }) => {
  const {asset: texture} = useAsset(imagesPaths[0] || null)
  
  const aspect = useRef(1)
  const ref = useRef()

  const material = useMemo(() => {
    return new THREE.MeshToonMaterial({ transparent: true })
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
  }, [texture, imagesPaths[0]])

  useEffect(() => {
    if (isSelected) {
      material.emissive = new THREE.Color(0x755bf9)
      material.color = new THREE.Color(0x222222)
    } else {
      material.emissive = new THREE.Color(0x000000)
      material.color = new THREE.Color(0xcccccc)
    }
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
