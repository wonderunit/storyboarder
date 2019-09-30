const THREE = require('three')

let raycaster = new THREE.Raycaster()
let tempMatrix = new THREE.Matrix4()

const getControllerRaycaster = controller => {
  tempMatrix.identity().extractRotation(controller.matrixWorld)

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)
  return raycaster
}

const getControllerIntersections = (controller, objects) => {
  return getControllerRaycaster(controller).intersectObjects(objects, true)
}

module.exports = {
  getControllerRaycaster,
  getControllerIntersections
}
