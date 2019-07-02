const controllerObjectSettings = {
  id: 'controller',
  model: 'controller-left',
  displayName: 'Controller',
  depth: 0.025,
  height: 0.025,
  width: 0.025,
  rotation: { x: (Math.PI / 180) * -45, y: 0, z: 0 },
  type: 'object',
  visible: true,
  x: 0,
  y: 0,
  z: 0
}

const cameraObjectSettings = {
  id: 'camera',
  model: 'camera',
  displayName: 'Camera',
  depth: 0.025,
  height: 0.025,
  width: 0.025,
  rotation: { x: 0, y: 0, z: 0 },
  type: 'object',
  visible: true,
  x: 0,
  y: 0,
  z: 0
}

module.exports = {
  controllerObjectSettings,
  cameraObjectSettings
}
