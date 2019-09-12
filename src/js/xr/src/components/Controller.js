const THREE = require('three')
const { useMemo } = React = require('react')

const Controller = ({ gltf }) => {
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

  return mesh
    ? <group>
      <primitive object={mesh} />
      <mesh name={'cursor'} visible={false}>
        <boxBufferGeometry attach="geometry" args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial attach="material" />
      </mesh>
    </group>
    : null
}

module.exports = Controller
