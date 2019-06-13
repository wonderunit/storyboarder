const { useUpdate } = require('react-three-fiber')
const { useEffect } = React = require('react')

const SGCamera = ({ aspectRatio, activeCamera, setDefaultCamera, audioListener, ...props }) => {
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

  useEffect(() => {
    if (ref.current) {
      if (activeCamera === props.id) {
        setDefaultCamera(ref.current)
        console.log('SGCamera: setDefaultCamera to', props.id)
      }
    }
  }, [])

  return <perspectiveCamera
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
  >
    <primitive object={audioListener} />
  </perspectiveCamera>
}

module.exports = SGCamera
