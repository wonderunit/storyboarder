const { useEffect, useMemo, useRef } = require('react')

const VirtualCamera = require('../components/VirtualCamera')

const Image = React.memo(({ sceneObject, isSelected, texture, visibleToCam }) => {
  const aspect = useRef(1)
  const ref = useRef()

  const { x, y, z, visible, height, rotation, opacity } = sceneObject

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

    if (material) material.map = texture
  }, [texture])

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
    material.opacity = opacity
  }, [opacity])

  useEffect(() => {
    if (visibleToCam) ref.current.children.forEach(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    else ref.current.children.forEach(child => child.layers.disable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
  }, [ref.current, visibleToCam])

  return (
    <group
      ref={ref}
      onController={sceneObject.visible ? () => null : null}
      userData={{
        type: 'image',
        id: sceneObject.id
      }}
      visible={visible}
      position={[x, z, y]}
      scale={[height * aspect.current, height, 1]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    >
      <mesh>
        <planeBufferGeometry attach="geometry" args={[1, 1]} />
        <primitive attach="material" object={material} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
        <planeBufferGeometry attach="geometry" args={[1, 1, 0.01]} />
        <primitive attach="material" object={material} />
      </mesh>
    </group>
  )
})

module.exports = Image
