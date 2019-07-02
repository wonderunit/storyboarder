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

const setControllerData = controller => {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)])
  const material = new THREE.LineBasicMaterial({
    color: 0x0000ff,
    depthTest: false,
    depthWrite: false,
    transparent: true
  })

  const line = new THREE.Line(geometry, material)
  line.name = 'line'
  line.scale.z = 5
  line.rotation.x = (Math.PI / 180) * -45
  controller.add(line)

  const raycastTiltGroup = new THREE.Group()
  const raycastDepth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial())
  raycastDepth.visible = false
  raycastDepth.name = 'raycast-depth'
  raycastTiltGroup.rotation.x = (Math.PI / 180) * -45
  raycastTiltGroup.add(raycastDepth)

  controller.add(raycastTiltGroup)

  controller.intersections = []
  controller.pressed = false
  controller.gripped = false
  controller.interaction = {
    grip: undefined,
    press: undefined,
    hover: undefined
  }
}

module.exports = {
  getIntersections,
  boneIntersect,
  intersectObjects,
  constraintObjectRotation,
  setControllerData
}
