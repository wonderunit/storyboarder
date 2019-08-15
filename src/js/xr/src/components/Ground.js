const THREE = require('three')

const Ground = ({ texture, visible }) => <mesh
  // slightly offset to allow for outlines
  position={[0, -0.03, 0]}
  rotation={[-Math.PI / 2, 0, 0]}
>
  <planeBufferGeometry attach='geometry' args={[45, 45]} />
  <meshLambertMaterial attach='material' side={THREE.FrontSide} visible={visible}>
    <primitive attach='map' object={texture} />
  </meshLambertMaterial>
</mesh>

module.exports = Ground
