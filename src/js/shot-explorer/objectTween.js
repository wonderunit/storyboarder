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

class ObjectTween {
  constructor(ref) {
    this.currentTween = null
    this.prevRotationEuler = new THREE.Euler()
    this.prevRotationQuaternion = new THREE.Quaternion()
    this.ref = ref
  }

  startTween(position = null, rotation = null, time = null, customUpdate = () => {}) {
    let ref = this.ref
    if (this.currentTween) {
      this.currentTween.stop()
    }

    if (rotation) {
      if (rotation.isQuaternion) {
        this.prevRotationQuaternion.copy(ref.quaternion)
      } else {
        this.prevRotationEuler.set(
            ref.rotation.x,
            ref.rotation.y,
            ref.rotation.z,
        )
      }
    }

    this.currentTween = new TWEEN.Tween([ref.position.x, ref.position.y, ref.position.z, 0])
    this.currentTween.to([position.x, position.y, position.z, 1], time || transitionTime(ref.position, position))
    this.currentTween.onUpdate(([x, y, z, dt]) => {
      if (ref) {
        ref.position.set(x, y, z)

        if (rotation) {
          if (rotation.isQuaternion) {
            THREE.Quaternion.slerp(
              this.prevRotationQuaternion,
                rotation,
                ref.quaternion,
                dt
            )
          } else {
            rotationLerp(
              this.prevRotationEuler,
                rotation,
                ref.rotation,
                dt
            )
          }
        }
        customUpdate(dt)
      }
    })

    this.currentTween.start()
  }

  stopTween() {
    if (this.currentTween) {
      this.currentTween.stop()
    }
  }

}

export default ObjectTween