const THREE = require('three')
const { useMemo } = React = require('react')

const Controller = React.memo(({ gltf, hand }) => {
  const mesh = useMemo(
    () => {
      let child = gltf.scene.children[0].clone()
      let material = child.material.clone()

      let map = material.map
      let alphaMap = material.metalnessMap
      child.material = new THREE.MeshBasicMaterial({
        map,
        alphaMap,
        transparent: true
      })

      return child
    },
    [gltf]
  )

  const scale = hand === 'left'
    ? [1, 1, 1]
    : [-1, 1, 1]

  return mesh
    ? <group>
      <primitive object={mesh} scale={scale} />
      <mesh name={'cursor'} visible={false}>
        <boxBufferGeometry attach="geometry" args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial attach="material" />
      </mesh>
    </group>
    : null
})

module.exports = Controller
