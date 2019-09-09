const THREE = require('three')
const { useRef, useEffect } = React = require('react')

const TeleportTarget = ({ api, texture, worldScale, visible }) => {
  const ref = useRef()

  useEffect(
    () => api.subscribe(
      state => (ref.current.position.set(...state)),
      { selector: state => state.teleportTargetPos }
    ),
    []
  )

  return <group position={[0, 0.5 * worldScale, 0]}>
    <mesh
      ref={ref}
      visible={visible}>
      <cylinderGeometry attach="geometry" args={[0.5 * worldScale, 0.5 * worldScale, 1 * worldScale, 32, 1, true]} />
      <meshBasicMaterial
        attach="material"
        opacity={0.25}
        color={0x7a72e9}
        transparent={true}
        depthTest={false}
        depthWrite={false}
        side={THREE.DoubleSide}
        visible={visible}
      >
        <primitive attach="map" object={texture} />
      </meshBasicMaterial>
    </mesh>
  </group>
}

module.exports = TeleportTarget
