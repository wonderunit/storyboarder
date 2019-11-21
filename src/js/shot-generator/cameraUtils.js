const THREE = require('three')

const clampCameraToBox = ({
  camera,
  box,
  direction
}) => {
  let sphere = new THREE.Sphere()
  box.getBoundingSphere(sphere)
  
  let h = sphere.radius / Math.tan(camera.fov / 2 * Math.PI / 180.0)
  
  let newPos = new THREE.Vector3().addVectors(sphere.center, direction.clone().setLength(h))
  
  return {
    position: newPos.clone(),
    target: sphere.center.clone()
  }
}

const getCameraInfo = (camera) => {
  /// Regarding to http://planning.cs.uiuc.edu/node103.html
  let rotationMatrix = new THREE.Matrix4().extractRotation(camera.matrixWorld)
  let elems = rotationMatrix.elements
  
  let alpha = Math.atan(elems[4] / elems[0])
  let beta = Math.atan(-elems[8] / Math.sqrt(Math.pow(elems[9], 2) + Math.pow(elems[10], 2)))
  let gamma = Math.atan(elems[9] / elems[10])
  
  
  let Pi = Math.PI;
  
  let lookAtVector = new THREE.Vector3()
  camera.getWorldDirection(lookAtVector)
  
  beta = (lookAtVector.z > 0) ? (beta + Pi) : -beta
  
  return {
    rotation: beta,
    tilt: alpha,
    roll: gamma
  }
}

const ShotSizes = {
  EXTREME_CLOSE_UP: 0,
  VERY_CLOSE_UP: 1,
  CLOSE_UP: 2,
  MEDIUM_CLOSE_UP: 3,
  BUST: 4,
  MEDIUM: 5,
  MEDIUM_LONG: 6,
  LONG: 7,
  EXTREME_LONG: 8
}

const ShotSizesInfo = {
  [ShotSizes.EXTREME_CLOSE_UP]: {
    bones: ['Head', 'leaf', 'Neck'],
    yReduction: [0.08, 0.0], // 8cm reduction bottom, 0cm reduction top
  },
  [ShotSizes.VERY_CLOSE_UP]: {
    bones: ['Head', 'Neck', 'leaf'],
    yReduction: [0.02, 0.0], // 2cm reduction bottom, 0cm reduction top
  },
  [ShotSizes.CLOSE_UP]: {
    bones: ['Head', 'Neck', 'leaf'],
    yReduction: [-0.02, -0.04], // -2cm reduction bottom, -4cm reduction top
  },
  [ShotSizes.MEDIUM_CLOSE_UP]: {
    bones: [
      'Head', 'Neck', 'leaf',
      'RightShoulder', 'LeftShoulder',
      'Spine2'
    ],
    yReduction: [0, -0.04]
  },
  [ShotSizes.BUST]: {
    bones: [
      'Head', 'Neck', 'leaf',
      'RightShoulder', 'LeftShoulder',
      'Spine1'
    ],
    yReduction: [0, -0.04]
  },
  [ShotSizes.MEDIUM]: {
    bones: [
      'Head', 'Neck', 'leaf',
      'RightShoulder', 'LeftShoulder',
      'Hips'
    ],
    yReduction: [0, -0.04]
  },
  [ShotSizes.MEDIUM_LONG]: {
    bones: [
      'Head', 'Neck', 'leaf',
      'RightShoulder', 'LeftShoulder',
      'Hips',
      'LeftUpLeg', 'RightUpLeg',
      'LeftLeg', 'RightLeg'
    ],
    yReduction: [0, -0.04]
  },
  [ShotSizes.LONG]: {
    bones: [
      'Head', 'Neck', 'leaf',
      'RightShoulder', 'LeftShoulder',
      'Hips',
      'LeftUpLeg', 'RightUpLeg',
      'LeftLeg', 'RightLeg',
      'leaf011', 'leaf012'
    ],
    yReduction: [0, -0.04]
  },
  [ShotSizes.EXTREME_LONG]: {
    bones: [
      'Head', 'Neck', 'leaf',
      'RightShoulder', 'LeftShoulder',
      'Hips',
      'LeftUpLeg', 'RightUpLeg',
      'LeftLeg', 'RightLeg',
      'leaf011', 'leaf012'
    ],
    relativeToScreen: 1.0 / 3.0 //height of a character is 1/3 of the view height
  }
}

const getBoneStartEndPos = (bone) => {
  let boneWorldPosition = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld)
  return {
    start: boneWorldPosition,
    end: boneWorldPosition.clone().add(bone.position)
  }
}

const getShotBox = (character, shotType = 0) => {
  let box = new THREE.Box3()
  
  let shotInfo = ShotSizesInfo[shotType]
  
  let bones = character.userData.skeleton.bones.filter((bone) => shotInfo.bones.indexOf(bone.name) !== -1)
  
  bones.forEach((bone) => {
    let boneInfo = getBoneStartEndPos(bone)
    box.expandByPoint(boneInfo.start)
    box.expandByPoint(boneInfo.end)
  })
  
  if (shotInfo.yReduction) {
    box.min.y += shotInfo.yReduction[0]
    box.max.y -= shotInfo.yReduction[shotInfo.yReduction.length - 1]
  } else if (shotInfo.relativeToScreen) {
    let size = new THREE.Vector3()
    box.getSize(size)
    
    size.y *= 1.0 / shotInfo.relativeToScreen
    
    box.min.y -= size.y * 0.5
    box.max.y += size.y * 0.5
  }
  
  return box;
}

const setShotSize = ({
  camera,
  objectsToClamp,
  updateObject,
  shotSize
}) => {
  if (!ShotSizesInfo[shotSize]) {
    return false
  }
  
  let direction = new THREE.Vector3()
  objectsToClamp[0].getWorldDirection(direction)
  
  let clampedInfo = clampCameraToBox({
    camera,
    direction,
    box: getShotBox(objectsToClamp[0], shotSize)
  })
  
  camera.position.copy(clampedInfo.position)
  camera.lookAt(clampedInfo.target)
  camera.updateMatrixWorld(true)
  
  let newState = getCameraInfo(camera)
  
  updateObject(camera.userData.id, {
    x: camera.position.x,
    y: camera.position.z,
    z: camera.position.y,
    rotation: newState.rotation,
    roll: 0,
    tilt: 0
  })
  
}

module.exports = {
  ShotSizes,
  setShotSize
}