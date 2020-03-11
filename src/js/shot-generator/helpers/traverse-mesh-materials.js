
const traverseMeshMaterials = (object3d, callback) => {
    object3d.traverse(child => {
      if (child.isMesh) {
        const material = child.material
        if (Array.isArray(material)) {
          material.forEach(material => {
            callback(material)
          })
        } else {
          callback(material)
        }
      }
    })
  }

export default traverseMeshMaterials
  