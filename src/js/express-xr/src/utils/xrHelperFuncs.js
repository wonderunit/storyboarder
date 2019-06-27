const findParent = obj => {
  while (obj) {
    if (!obj.parent || obj.parent.type === 'Scene' || obj.parent.userData.type === 'world-scale') {
      return obj
    }
    obj = obj.parent
  }

  return null
}

const moveObject = (event, controller, worldScale) => {
  if (Math.abs(event.axes[1]) < Math.abs(event.axes[0])) return

  // EDIT THIS

  const amount = event.axes[1] * 0.08
  const object = controller.userData.selected

  if (Math.abs(amount) > 0.01) {
    const worldScaleMult = worldScale === 1 ? 1 : worldScale * 2
    if (
      object.userData.type === 'character' ||
      (controller.pressed && controller.gripped && object.userData.type === 'object')
    ) {
      const raycastDepth = controller.getObjectByName('raycast-depth')
      raycastDepth.position.add(new THREE.Vector3(0, 0, amount * worldScaleMult))
      raycastDepth.position.z = Math.min(raycastDepth.position.z, -0.5 * worldScaleMult)
    } else {
      // 45 degree tilt down on controller
      let offsetVector = new THREE.Vector3(0, amount * worldScaleMult, amount * worldScaleMult)
      object.position.add(offsetVector)
      object.position.y = Math.min(object.position.y, -0.5 * worldScaleMult)
      object.position.z = Math.min(object.position.z, -0.5 * worldScaleMult)
    }
  }
}

const rotateObject = (event, controller) => {
  if (Math.abs(event.axes[0]) < Math.abs(event.axes[1])) return

  // EDIT THIS

  const amount = event.axes[0] * 0.07
  const object = controller.userData.selected

  if (Math.abs(amount) > 0.01) {
    if (object.userData.type === 'character') {
      object.userData.modelSettings.rotation += amount
    } else {
      object.rotateY(amount)
    }
  }
}

const createHideArray = scene => {
  const array = []
  scene.traverse(child => {
    if (
      child.type === 'Line' ||
      child.userData.type === 'virtual-camera' ||
      child.userData.id === 'controller' ||
      child.userData.type === 'gui' ||
      child.userData.type === 'bone'
    ) {
      array.push(child)
    }
  })
  return array
}

const getFilepathForLoadable = ({ type, model }) => {
  // does the model name have a slash in it?
  // TODO support windows file delimiter
  let isUserModel = !!model.match(/\//)

  if (isUserModel) {
    const parts = model.split(/\//)
    const filename = parts[parts.length - 1]

    switch (type) {
      case 'character':
        return `/data/user/characters/${filename}`
      case 'object':
        return `/data/user/objects/${filename}`
      case 'environment':
        return `/data/user/environments/${filename}`
      default:
        return null
    }
  } else {
    switch (type) {
      case 'character':
        if (model === 'adult-male') model = 'adult-male-lod'
        return `/data/system/dummies/gltf/${model}.glb`
      case 'object':
        return `/data/system/objects/${model}.glb`
      default:
        return null
    }
  }
}

const updateObjectHighlight = object => {
  object.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const objMaterial = child.material
      if (Array.isArray(objMaterial)) {
        objMaterial.forEach(material => {
          if (!material.emissive) return
          material.emissive.b = 0
        })
      } else {
        if (!objMaterial.emissive) return
        objMaterial.emissive.b = 0
      }
    }
  })
}

module.exports = {
  findParent,
  moveObject,
  rotateObject,
  createHideArray,
  getFilepathForLoadable,
  updateObjectHighlight
}
