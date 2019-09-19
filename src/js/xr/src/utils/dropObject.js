let raycaster = new THREE.Raycaster()
let objectBox = new THREE.Box3()
let objectCenter = new THREE.Vector3()
let lowerCenter = new THREE.Vector3()
const dropObject = (object, dropToObjects) =>
{
    objectBox.setFromObject(object)
    objectBox.getCenter(objectCenter)
    lowerCenter.set(objectCenter.x, objectBox.min.y, objectCenter.z)
    raycaster.ray.origin.copy(lowerCenter)
    raycaster.ray.direction.set(0, -1, 0)
    return raycaster.intersectObjects(dropToObjects, true)
}
module.exports = dropObject
