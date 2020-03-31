import * as THREE from "three"
import anime from "animejs"

const tweenObjectMatrix = (object, matrix, parameters = {}) => {
  const pos = new THREE.Vector3()
  const rot = new THREE.Quaternion()
  const scale = new THREE.Vector3()

  const localMatrix = new THREE.Matrix4()
  localMatrix.elements = Array.isArray(matrix) ? matrix : matrix.elements
  localMatrix.decompose(pos, rot, scale)

  const prevPos = object.position.clone()
  const prevRot = object.quaternion.clone()

  const targets = {delta: 0}

  anime({
    targets,
    delta: 1.0,
    duration: 200,
    easing: 'linear',
    ...parameters,
    update: (animation) => {
      const dt = animation.progress / 100.0

      object.position.lerpVectors(prevPos, pos, dt)
      THREE.Quaternion.slerp(prevRot, rot, object.quaternion, dt)
    }
  })

  return () => {
    anime.remove(targets)
  }
}

export default tweenObjectMatrix
