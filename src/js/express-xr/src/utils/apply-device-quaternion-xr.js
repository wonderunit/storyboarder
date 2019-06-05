const applyDeviceQuaternion = ({
  parent,
  startingDeviceOffset,
  startingObjectOffset,
  startingObjectQuaternion,
  deviceQuaternion,
  camera
}) => {
  let deviceDifference = new THREE.Quaternion().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset).normalize()
  // get camera's offset
  // let cameraOffset = new THREE.Quaternion().clone().inverse().multiply(camera.quaternion.clone())
  // get parent's offset
  let parentOffset = new THREE.Quaternion().clone().inverse().multiply(parent.quaternion.clone()) // TODO is this required?
  parent.getWorldQuaternion(parentOffset)

  // START WITH THE INVERSE OF THE STARTING OBJECT ROTATION
  let objectQuaternion = startingObjectQuaternion.clone().inverse()

  // ZERO OUT (ORDER IS IMPORTANT)
  // offset
  objectQuaternion.multiply(startingObjectOffset)
  // parent's rotation
  objectQuaternion.multiply(parentOffset.inverse())
  // camera
  // objectQuaternion.multiply(cameraOffset)

  // APPLY THE DEVICE DIFFERENCE, THIS IS THE MAJOR OPERATION
  objectQuaternion.multiply(deviceDifference)

  // ROTATE THE ZEROS BACK INTO PLACE (REVERSE ORDER)
  // camera
  // objectQuaternion.multiply(cameraOffset.inverse())
  // parent's rotation
  objectQuaternion.multiply(parentOffset.inverse())
  // offset
  objectQuaternion.multiply(startingObjectOffset)

  return objectQuaternion
}

module.exports = applyDeviceQuaternion