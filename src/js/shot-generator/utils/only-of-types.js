// remove any object with a type that is not on the allowlist
const onlyOfTypes = (object3d, allowlist) => {
  let removable = []

  object3d.traverse(child => {
    // if we don't allow this type of Object3d ...
    if ( ! allowlist.includes(child.type) ) {
      // ... mark it for removal
      removable.push(child)
    }
  })

  // remove the marked objects
  removable.forEach(child => child.parent.remove(child))

  return object3d
}

export default onlyOfTypes