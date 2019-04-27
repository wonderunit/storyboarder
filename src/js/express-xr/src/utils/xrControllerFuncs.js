const THREE = require('three')
window.THREE = window.THREE || THREE

const intersected = []
const raycaster = new THREE.Raycaster()
const tempMatrix = new THREE.Matrix4()

const getIntersections = (controller, intersectArray) => {
  tempMatrix.identity().extractRotation(controller.matrixWorld)
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)
  return raycaster.intersectObjects(intersectArray)
}

const intersectObjects = (controller, intersectArray) => {
  if (controller.userData.selected !== undefined) return
  var line = controller.getObjectByName('line')
  var intersections = getIntersections(controller, intersectArray)
  if (intersections.length > 0) {
    var intersection = intersections[0]
    var object = intersection.object
    var objMaterial = object.material

    if (Array.isArray(objMaterial)) {
      objMaterial.forEach(material => {
        material.emissive.g = 0.25
      })
    } else {
      objMaterial.emissive.g = 0.25
    }

    intersected.push(object)
    line.scale.z = intersection.distance
  } else {
    line.scale.z = 5
  }
}

const cleanIntersected = () => {
  while (intersected.length) {
    var object = intersected.pop()
    var objMaterial = object.material

    if (Array.isArray(objMaterial)) {
      objMaterial.forEach(material => {
        material.emissive.g = 0
      })
    } else {
      objMaterial.emissive.g = 0
    }
  }
}

const onSelectStart = () => {
  console.log('start')
}

const onSelectEnd = () => {
  console.log('end')
}

module.exports = {
  getIntersections,
  intersectObjects,
  cleanIntersected,
  onSelectStart,
  onSelectEnd
}
