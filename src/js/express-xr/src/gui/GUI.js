const { useMemo } = (React = require('react'))
const SGVirtualCamera = require('../components/SGVirtualCamera')

import * as SDFText from './sdftext'
const textCreator = SDFText.creator()

const cameraSettings = {
  id: 'gui-camera',
  x: 0,
  y: -0.25,
  z: 0.5,
  fov: 22,
  rotation: 0,
  tilt: 0,
  roll: 0
}

const GUI = ({ aspectRatio }) => {
  const fovLabel = useMemo(() => {
    return textCreator.create('22mm')
  }, [])

  const otherLabel = useMemo(() => {
    return textCreator.create('Object 1')
  }, [])

  return (
    <group>
      <primitive object={fovLabel} position={[0.5, 0.5, -0.2]} scale={[2, 2, 2]} />
      <primitive object={otherLabel} position={[-0.75, 0.5, -0.2]} scale={[2, 2, 2]} />
      <SGVirtualCamera {...{ aspectRatio, ...cameraSettings }} />
    </group>
  )
}

module.exports = GUI
