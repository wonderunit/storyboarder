const { useUpdate } = require('react-three-fiber')
const { useEffect, useRef } = (React = require('react'))

const SGSpotLight = ({ ...props }) => {
  const light = useRef(null)
  const box_light_mesh = useRef(null)

  const light_spot = useUpdate(
    self => {
      self.target.position.set(0, 0, props.intensity)
      self.add(self.target)
    },
    [props.position]
  )

  useEffect(() => {
    if (light.current) {
      light.current.light = light_spot
      light.current.hitter = box_light_mesh
    }
  })

  useUpdate(() => {
    if (light.current) {
      light.current.rotation.x = 0
      light.current.rotation.z = 0
      light.current.rotation.y = props.rotation
      light.current.rotateX(props.tilt)
      light.current.light.current.target.position.set(0, 0, props.distance)
    }
  }, [props.rotation, props.tilt, props.distance])

  return (
    <group>
      <group name="orthoIcon" />
      <group
        ref={light}
        visible={props.visible}
        userData={{ id: props.id, type: props.type }}
        position={[props.x, props.z, props.y]}
      >
        <spotLight
          ref={light_spot}
          color={0xffff66}
          intensity={props.intensity}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          angle={props.angle}
          distance={props.distance}
          penumbra={props.penumbra}
          decay={props.decay}
        />
        <mesh ref={box_light_mesh} name="hitter_light" userData={{ type: 'hitter_light' }}>
          <cylinderBufferGeometry attach="geometry" args={[0.0, 0.05, 0.14]} />
          <meshLambertMaterial attach="material" color={0xffff66} />
        </mesh>
      </group>
    </group>
  )
}

module.exports = SGSpotLight
