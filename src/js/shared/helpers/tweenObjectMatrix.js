import * as THREE from "three"
import TWEEN from '@tweenjs/tween.js'

const defaultClear = () => {}
const tweenObjectMatrix = (object, matrix = null, parameters = {}) => {
  if (!matrix) {
    return defaultClear
  }
  
  const pos = new THREE.Vector3()
  const rot = new THREE.Quaternion()
  const scale = new THREE.Vector3()

  const localMatrix = new THREE.Matrix4()
  localMatrix.elements = Array.isArray(matrix) ? matrix : matrix.elements
  
  if (!localMatrix.elements || localMatrix.elements.length !== 16) {
    return false
  }
  
  localMatrix.decompose(pos, rot, scale)

  const prevPos = object.position.clone()
  const prevRot = object.quaternion.clone()

  let dt = {time: 0.0}
  const tween = new TWEEN.Tween(dt)
  .to({time: 1.0}, 200)
  .easing(TWEEN.Easing.Quadratic.Out)
  .onUpdate(() => {
    object.position.lerpVectors(prevPos, pos, dt.time)
    THREE.Quaternion.slerp(prevRot, rot, object.quaternion, dt.time)
  })
  .start()

  return () => {
    tween.stop()
  }
}

export default tweenObjectMatrix
