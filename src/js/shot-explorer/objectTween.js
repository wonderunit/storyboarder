import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js'

const rotationLerp = (r1, r2, target, dx) => {
  target.set(
      r1.x + (r2.x - r1.x) * dx,
      r1.y + (r2.y - r1.y) * dx,
      r1.z + (r2.z - r1.z) * dx
  )
}
const MS_TO_METER = 150

/**
 * Calculates time of a transition from start to end
 * @param start
 * @param end
 * @returns {number}
 */
const transitionTime = (start, end) => {
  return new THREE.Vector3(end.x, end.y, end.z).sub(new THREE.Vector3(start.x, start.y, start.z)).length() * MS_TO_METER
}

export default (ref) => {
  let currentTween = null

  let prevRotationEuler = new THREE.Euler()
  let prevRotationQuaternion = new THREE.Quaternion()

  return (position = null, rotation = null, time = null) => {
    if (currentTween) {
      currentTween.stop()
    }

    if (rotation) {
      if (rotation.isQuaternion) {
        prevRotationQuaternion.copy(ref.quaternion)
      } else {
        prevRotationEuler.set(
            ref.rotation.x,
            ref.rotation.y,
            ref.rotation.z,
        )
      }
    }

    currentTween = new TWEEN.Tween([ref.position.x, ref.position.y, ref.position.z, 0])
    currentTween.to([position.x, position.y, position.z, 1], time || transitionTime(ref.position, position))

    currentTween.onUpdate(([x, y, z, dt]) => {
      if (ref) {
        ref.position.set(x, y, z)

        if (rotation) {
          if (rotation.isQuaternion) {
            THREE.Quaternion.slerp(
                prevRotationQuaternion,
                rotation,
                ref.quaternion,
                dt
            )
          } else {
            rotationLerp(
                prevRotationEuler,
                rotation,
                ref.rotation,
                dt
            )
          }
        }
      }
    })

    currentTween.start()
  }
}