const { useEffect, useRef } = (React = require('react'))

const SGWorld = ({ groundTexture }) => {
  const ambientLight = useRef(null)
  const directionalLight = useRef(null)
  const ground = useRef(null)

  useEffect(() => {
    if (directionalLight.current) {
      directionalLight.current.target.position.set(0, 0, 0.4)
      directionalLight.current.add(directionalLight.current.target)
      directionalLight.current.rotation.x = 0
      directionalLight.current.rotation.z = 0
      directionalLight.current.rotation.y = world.directional.rotation
      directionalLight.current.rotateX(world.directional.tilt + Math.PI / 2)
    }
  })

  return (
    <>
      <ambientLight ref={ambientLight} color={0xffffff} intensity={world.ambient.intensity} />
      <directionalLight
        ref={directionalLight}
        color={0xffffff}
        intensity={world.directional.intensity}
        position={[0, 1.5, 0]}
      />
      texture.image &&{' '}
      <mesh
        ref={ground}
        visible={true /*!world.room.visible*/}
        userData={{ type: 'ground' }}
        position={new THREE.Vector3(0, -0.03, 0)}
        rotation={new THREE.Euler(-Math.PI / 2, 0, 0)}
        geometry={new THREE.PlaneGeometry(135 / 3, 135 / 3, 32)}
      >
        <meshToonMaterial attach="material" side={THREE.FrontSide}>
          <primitive attach="map" object={groundTexture} />
        </meshToonMaterial>
      </mesh>
      />
    </>
  )
}

module.exports = SGWorld
