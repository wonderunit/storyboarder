const intersected = []
const raycaster = new THREE.Raycaster()
const tempMatrix = new THREE.Matrix4()

const getIntersections = (controller, intersectArray) => {
  tempMatrix.identity().extractRotation(controller.matrixWorld)
  const tiltControllerMatrix = new THREE.Matrix4().makeRotationX((Math.PI / 180) * -45)
  tempMatrix.multiply(tiltControllerMatrix)

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)
  return raycaster.intersectObjects(intersectArray, true)
}

const boneIntersect = (controller, bonesHelper) => {
  tempMatrix.identity().extractRotation(controller.matrixWorld)
  const tiltControllerMatrix = new THREE.Matrix4().makeRotationX((Math.PI / 180) * -45)
  tempMatrix.multiply(tiltControllerMatrix)

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)
  return raycaster.intersectObject(bonesHelper)
}

const intersectObjects = (controller, intersectArray) => {
  if (controller.userData.selected !== undefined) return
  var line = controller.getObjectByName('line')
  var intersections = getIntersections(controller, intersectArray)

  if (intersections.length > 0) {
    var intersection = intersections[0]
    return intersection
  } else {
    return null
  }
}

const constraintObjectRotation = (controller, worldScale) => {
  const object = controller.userData.selected

  const raycastDepth = controller.getObjectByName('raycast-depth')
  const depthWorldPos = raycastDepth.getWorldPosition(new THREE.Vector3())
  depthWorldPos.sub(controller.userData.posOffset)

  if (object.userData.type === 'character') {
    object.rotation.y = object.userData.modelSettings.rotation
    object.position.copy(depthWorldPos).multiplyScalar(1 / worldScale)
  } else {
    object.position.copy(depthWorldPos).multiplyScalar(1 / worldScale)
  }
}

module.exports = {
  getIntersections,
  boneIntersect,
  intersectObjects,
  constraintObjectRotation
}
