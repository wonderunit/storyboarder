const THREE = require('three')

let raycaster = new THREE.Raycaster()
let tempMatrix = new THREE.Matrix4()

const getIntersections = (controller, objects) => {
  tempMatrix.identity().extractRotation(controller.matrixWorld)

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)
  return raycaster.intersectObjects(objects, true)
}

module.exports = getIntersections
