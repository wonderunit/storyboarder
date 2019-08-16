// via https://stackoverflow.com/a/2259502
const rotatePoint = (point, pivot, angle) => {
  let p = new THREE.Vector3()

  let s = Math.sin(angle)
  let c = Math.cos(angle)

  // subtract the pivot point
  p.x = point.x - pivot.x
  p.z = point.z - pivot.z

  // rotate
  let x = p.x * c - p.z * s
  let y = p.x * s + p.z * c

  // translate new point back
  p.x = x + pivot.x
  p.z = y + pivot.z

  return p
}

module.exports = rotatePoint
