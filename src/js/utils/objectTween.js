const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js');
const transitionTime = require('./transitionTime');

const rotationLerp = (r1, r2, target, dx) => {
  target.set(
      r1.x + (r2.x - r1.x) * dx,
      r1.y + (r2.y - r1.y) * dx,
      r1.z + (r2.z - r1.z) * dx
  )
}

module.exports = (ref) => {
  let currentTween = null
  
  let prevRotationEuler = new THREE.Euler()
  let prevRotationQuaternion = new THREE.Quaternion()
  
  return (position = null, rotation = null, time = null) => {
    if (currentTween) {
      currentTween.stop()
    }
    
    if (rotation) {
      if (rotation.isQuaternion) {
        prevRotationQuaternion.copy(ref.current.quaternion)
      } else {
        prevRotationEuler.set(
            ref.current.rotation.x,
            ref.current.rotation.y,
            ref.current.rotation.z,
        )
      }
    }
    
    currentTween = new TWEEN.Tween([ref.current.position.x, ref.current.position.y, ref.current.position.z, 0])
    currentTween.to([position.x, position.y, position.z, 1], time || transitionTime(ref.current.position, position))
    
    currentTween.onUpdate(([x, y, z, dt]) => {
      if (ref.current) {
        ref.current.position.set(x, y, z)
        
        if (rotation) {
          if (rotation.isQuaternion) {
            THREE.Quaternion.slerp(
                prevRotationQuaternion,
                rotation,
                ref.current.quaternion,
                dt
            )
          } else {
            rotationLerp(
                prevRotationEuler,
                rotation,
                ref.current.rotation,
                dt
            )
          }
        }
      }
    })
    
    currentTween.start()
  }
}
