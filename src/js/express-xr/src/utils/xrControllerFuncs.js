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
    var object = intersection.object

    // intersected.push(object)
    line.scale.z = intersection.distance
    return intersection
  } else {
    line.scale.z = 5
    return null
  }
}

const cleanIntersected = () => {
  while (intersected.length) {
    var object = intersected.pop()
  }
}

module.exports = {
  getIntersections,
  boneIntersect,
  intersectObjects,
  cleanIntersected
}
