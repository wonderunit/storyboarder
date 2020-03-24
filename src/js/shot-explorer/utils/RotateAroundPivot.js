import * as THREE from 'three'
const pivot = new THREE.Object3D()
const rotateAroundPivot = (point, object, rotation) => {
    pivot.position.copy(point)
    pivot.updateMatrixWorld(true)
    pivot.updateMatrix()
    let parent = object.parent
    let position = object.position.clone()
    object.position.set(0, 0, 0)
    pivot.add(object)
    object.updateMatrixWorld(true)
    pivot.rotation.copy(rotation)
    pivot.updateMatrixWorld(true)
    object.updateMatrixWorld(true)
    let quaternion = pivot.worldQuaternion()
    pivot.remove(object)
    object.updateMatrixWorld(true)
    object.quaternion.copy(quaternion)
    object.position.copy(position)
    object.updateMatrixWorld(true)
    parent && parent.attach(object)
}

export default rotateAroundPivot