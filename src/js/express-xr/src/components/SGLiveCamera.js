const { useMemo } = React = require('react')

const SGLiveCamera = ({
  cameraRef,
  aspectRatio,
  activeCamera,
  setDefaultCamera,
  audioListener,
  ...props
}) => {
  useMemo(() => {
    if (cameraRef.current) {
      cameraRef.current.rotation.x = 0
      cameraRef.current.rotation.z = 0
      cameraRef.current.rotation.y = props.rotation

      cameraRef.current.rotateX(props.tilt)
      cameraRef.current.rotateZ(props.roll)
    }
  }, [cameraRef.current, props.rotation, props.tilt, props.roll])

  useMemo(() => {
    if (cameraRef.current) {
      if (activeCamera === props.id) {
        console.log('SGLiveCamera: setDefaultCamera to', props.id)
        setDefaultCamera(cameraRef.current)
      }
    }
  }, [cameraRef.current])

  return <perspectiveCamera
    ref={cameraRef}

    userData={{
      type: props.type,
      id: props.id
    }}

    aspect={aspectRatio}
    fov={props.fov}
    near={0.01}
    far={1000}

    onUpdate={self => self.updateProjectionMatrix()}
  >
    <primitive object={audioListener} />
  </perspectiveCamera>
}

module.exports = SGLiveCamera
