const { useUpdate } = require('react-three-fiber')

const VirtualCamera = require('../components/VirtualCamera')

const Light = React.memo(({ sceneObject, isSelected, texture, children }) => {
  const ref = useUpdate(self => {
    self.rotation.x = 0
    self.rotation.z = 0
    self.rotation.y = sceneObject.rotation || 0
    self.rotateX(sceneObject.tilt || 0)
    self.rotateZ(sceneObject.roll || 0)

    // TODO
    // spotLight.target.position.set(0, 0, sceneObject.distance)

    self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
  }, [sceneObject.rotation, sceneObject.tilt, sceneObject.roll, sceneObject.distance])

  const spotLight = useRef()
  // const spotLight = useUpdate(
  //   self => {
  //     // TODO
  //     // self.target.position.set(0, 0, sceneObject.distance)
  //     // self.add(self.target)
  //   },
  //   [sceneObject.intensity, sceneObject.distance]
  // )

  return (
    <group
      ref={ref}
      onController={sceneObject.visible ? () => null : null}
      visible={sceneObject.visible}
      userData={{
        id: sceneObject.id,
        type: 'light'
      }}
      position={[sceneObject.x, sceneObject.z, sceneObject.y]}
    >
      {/* selectable cone */}
      <mesh>
        <cylinderBufferGeometry attach="geometry" args={[0.0, 0.05, 0.14]} />
        <meshLambertMaterial
          attach="material"
          color={0xffff66}
          emissive-b={isSelected ? 0.15 : 0}
        />
      </mesh>

      {/* hit target */}
      <mesh>
        <sphereBufferGeometry attach="geometry" args={[0.125]} />
        <meshLambertMaterial attach="material" visible={false} />
      </mesh>

      <spotLight
        ref={spotLight}
        color={0xffffff}
        intensity={sceneObject.intensity}
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        angle={sceneObject.angle}
        distance={sceneObject.distance}
        penumbra={sceneObject.penumbra}
        decay={sceneObject.decay}
      />

      {/* simulated light */}
      {/*
        <mesh
          position={[0, (sceneObject.distance + 0.14) * -0.5, 0]}
          scale={[1, -1, 1]}
          userData={{ preventInteraction: true }}
        >
          <cylinderBufferGeometry
            attach="geometry"
            args={[sceneObject.distance * Math.tan(sceneObject.angle), 0.05, sceneObject.distance, 64, 1, true]}
          />
          <meshBasicMaterial attach="material" transparent={true} color={0xffffff} opacity={sceneObject.intensity * 0.5}>
            <primitive attach="map" object={texture} />
          </meshBasicMaterial>
        </mesh>
      */}

      {children}
    </group>
  )
})

module.exports = Light
