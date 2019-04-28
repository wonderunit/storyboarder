const { useEffect, useRef, useMemo } = (React = require('react'))
const buildSquareRoom = require('../../../shot-generator/build-square-room')

const SGWorld = ({ groundTexture, wallTexture, world, modelData }) => {
  const ambientLight = useRef(null)
  const directionalLight = useRef(null)
  const ground = useRef(null)
  const room = useRef(null)

  const roomMesh = buildSquareRoom(world.room.width, world.room.length, world.room.height, {
    textures: { wall: wallTexture }
  })
  roomMesh.position.y = -0.03
  roomMesh.children[0].layers.enable(0)

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

  const environmentRef = useRef()
  const environmentObject = useMemo(() => {
    if (!modelData) return null

    const g = new THREE.Group()

    modelData.scene.children.forEach(child => {
      if (child.type === 'Mesh') {
        let m = child.clone()
    
        const material = new THREE.MeshToonMaterial({
          color: 0xffffff,
          emissive: 0x0,
          specular: 0x0,
          skinning: true,
          shininess: 0,
          flatShading: false
        })
        m.material = material
    
        g.add(m)
      }
    })

    return g
  }, [modelData])

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
        name="ground"
        userData={{ type: 'ground' }}
        position={new THREE.Vector3(0, -0.03, 0)}
        rotation={new THREE.Euler(-Math.PI / 2, 0, 0)}
        geometry={new THREE.PlaneGeometry(135 / 3, 135 / 3, 32)}
      >
        <meshToonMaterial attach="material" side={THREE.FrontSide} visible={!world.room.visible && world.ground}>
          <primitive attach="map" object={groundTexture} />
        </meshToonMaterial>
      </mesh>
      <primitive ref={room} name="room" object={roomMesh} visible={world.room.visible} />
      {environmentObject && (
        <primitive
          ref={environmentRef}
          object={environmentObject}
          scale={[world.environment.scale, world.environment.scale, world.environment.scale]}
          rotation={[0, world.environment.rotation, 0]}
          position={[world.environment.x, world.environment.z, world.environment.y]}
          visible={world.environment.visible}
        />
      )}
      />
    </>
  )
}

module.exports = SGWorld
