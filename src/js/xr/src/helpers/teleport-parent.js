const rotatePoint = require('./rotate-point')

const teleportParent = (parent, child, x, y, z, r) => {
  // if x and y both present
  if (x != null && z != null) {
    let center = new THREE.Vector3()
    child.getWorldPosition(center)

    let dx = parent.position.x - center.x
    let dz = parent.position.z - center.z

    parent.position.x = x + dx
    parent.position.z = z + dz
    parent.updateMatrixWorld()
  }

  // if z is present
  if (y != null) {
    parent.position.y = y
  }

  if (r != null) {
    let center = new THREE.Vector3()
    child.getWorldPosition(center)

    let gr = child.rotation.y + parent.rotation.y

    let dr = gr - r

    let v = rotatePoint(parent.position, center, dr)

    parent.position.x = v.x
    parent.position.z = v.z
    parent.rotation.y = r - child.rotation.y
  }
}

module.exports = teleportParent
