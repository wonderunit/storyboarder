const THREE = require('three')

const Ground = ({ objRef, texture, visible }) =>
{
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.offset.set( 0, 0 );
  texture.repeat.set( 100, 100 );

  return <mesh
    ref={objRef}
    // slightly offset to allow for outlines
    position={[0, -0.03, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <planeBufferGeometry attach='geometry' args={[100, 100]} />
    <meshLambertMaterial attach='material' side={THREE.FrontSide} visible={visible}>
      <primitive attach='map' object={texture} />
    </meshLambertMaterial>
  </mesh>
}

module.exports = Ground
