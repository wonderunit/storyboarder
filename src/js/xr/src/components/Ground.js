const THREE = require('three')
const { useMemo } = React = require('react')

const Ground = React.memo(({ objRef, texture, visible }) => {
  useMemo(() => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.offset.set(0, 0)
    texture.repeat.set(100, 100)
  }, [texture])

  return <mesh
    ref={objRef}
    // slightly offset to allow for outlines
    position={[0, -0.03, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
    userData={{
      type: 'ground'
    }}
  >
    <planeBufferGeometry attach='geometry' args={[100, 100]} />
    <meshLambertMaterial attach='material' side={THREE.FrontSide} visible={visible}>
      <primitive attach='map' object={texture} />
    </meshLambertMaterial>
  </mesh>
})

module.exports = Ground
