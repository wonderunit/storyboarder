const { useUpdate } = require('../lib/react-three-fiber')
const { useLayoutEffect } = React = require('react')

const SGCamera = ({ i, aspectRatio, activeCamera, setDefaultCamera, ...props }) => {
  const ref = useUpdate(
    self => {
      self.rotation.x = 0
      self.rotation.z = 0
      self.rotation.y = props.rotation

      self.rotateX(props.tilt)
      self.rotateZ(props.roll)
    },
    [props.rotation, props.tilt, props.roll]
  )

  useLayoutEffect(() => {
    if (activeCamera === props.id) {
      setDefaultCamera(ref.current)
    }
  }, [activeCamera])

  return <perspectiveCamera
    key={i}
    ref={ref}

    userData={{
      type: props.type,
      id: props.id
    }}

    aspect={aspectRatio}
    fov={props.fov}
    near={0.01}
    far={1000}

    position={[ props.x, props.z, props.y ]}

    onUpdate={self => self.updateProjectionMatrix()}
  />
}

module.exports = SGCamera