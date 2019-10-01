const { useUpdate } = require('react-three-fiber')
const { useMemo } = require('react')

const VirtualCamera = require('../components/VirtualCamera')

const Light = React.memo(({ gltf, sceneObject, isSelected, worldScale, children }) => {
  const mesh = useMemo(
    () => gltf.scene.children[0].clone(),
    [gltf]
  )

  const ref = useUpdate(self => {
    self.rotation.x = 0
    self.rotation.z = 0
    self.rotation.y = sceneObject.rotation || 0
    self.rotateX(sceneObject.tilt || 0)
    self.rotateZ(sceneObject.roll || 0)
  }, [sceneObject.rotation, sceneObject.tilt, sceneObject.roll])

  const spotLight = useUpdate(
    self => {
      self.target.position.set(0, 0, sceneObject.distance * worldScale)
      self.add(self.target)

      // render the SpotLight in the VirtualCamera
      self.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER)
    },
    [sceneObject.distance, worldScale]
  )

  let lightColor = 0x8c78f1

  if (isSelected) {
    lightColor = 0x7256ff
  }

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
      <primitive
        object={mesh}
        rotation={[-Math.PI/2, Math.PI, 0]}
      >
        <meshBasicMaterial
          attach="material"
          color={lightColor}
          flatShading={false}
        />
      </primitive>

      {/* hit target, not needed with new larger model */}
      {/* <mesh>
        <sphereBufferGeometry attach="geometry" args={[0.125]} />
        <meshLambertMaterial attach="material" visible={true} />
      </mesh> */}

      <spotLight
        ref={spotLight}
        color={0xffffff}
        intensity={sceneObject.intensity}
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        angle={sceneObject.angle}
        distance={sceneObject.distance * worldScale}
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
