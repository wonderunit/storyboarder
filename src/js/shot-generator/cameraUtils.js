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

const ShotSizes = {
  EXTREME_CLOSE_UP: 0,
  VERY_CLOSE_UP: 1,
  CLOSE_UP: 2,
  MEDIUM_CLOSE_UP: 3,
  BUST: 4,
  MEDIUM: 5,
  MEDIUM_LONG: 6,
  LONG: 7,
  EXTREME_LONG: 8,
  ESTABLISHING: 9,
  OTS_LEFT: 10,
  OTS_RIGHT: 11,
}

const ShotAngles = {
  BIRDS_EYE: 0,
  HIGH: 1,
  EYE: 2,
  LOW: 3,
  WORMS_EYE: 4
}

const ShotAnglesInfo = {
  [ShotAngles.BIRDS_EYE]: -30 * THREE.Math.DEG2RAD,
  [ShotAngles.HIGH]: -15 * THREE.Math.DEG2RAD,
  [ShotAngles.EYE]: 0,
  [ShotAngles.LOW]: 30 * THREE.Math.DEG2RAD,
  [ShotAngles.WORMS_EYE]: 45 * THREE.Math.DEG2RAD
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
  },
  [ShotSizes.OTS_LEFT]: {
    bones: [
      'Head', 'Neck', 'leaf',
      'LeftShoulder'
    ],
    backSide: true,
    pan: 0.5
  },
  [ShotSizes.OTS_RIGHT]: {
    bones: [
      'Head', 'Neck', 'leaf',
      'RightShoulder',
    ],
    backSide: true,
    pan: -0.5
  }
}

const getBoneStartEndPos = (bone) => {
  let boneWorldPosition = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld)
  return {
    start: boneWorldPosition,
    end: boneWorldPosition.clone().add(bone.position)
  }
}

const getShotInfo = ({objectsToClamp, shotSize, camera}) => {
  let direction = new THREE.Vector3()
  objectsToClamp[0].getWorldDirection(direction)
  
  let box = getShotBox(objectsToClamp[0], shotSize)
  if (shotSize === ShotSizes.ESTABLISHING) {
    for (let i = 0; i < objectsToClamp.length; i++) {
      box.expandByObject(objectsToClamp[i])
    }
    
    if (objectsToClamp.length > 1) {
      direction = new THREE.Vector3()
      
      for (let i = 0; i < objectsToClamp.length - 1; i += 2) {
        direction.add(objectsToClamp[i + 1].position.clone().sub(objectsToClamp[i].position.clone()))
      }
      
      direction.divideScalar(objectsToClamp.length)
      
      direction = camera.position.clone().sub(direction)
      direction.y = camera.y
    }
  } else if (!ShotSizesInfo[shotSize]) {
    return false
  }
  
  if (ShotSizesInfo[shotSize] && ShotSizesInfo[shotSize].backSide) {
    direction.negate()
  }
  
  let clampedInfo = clampCameraToBox({
    camera,
    direction,
    box
  })
  
  if (ShotSizesInfo[shotSize] && ShotSizesInfo[shotSize].pan) {
    let pan = ShotSizesInfo[shotSize].pan
    
    let panVector = new THREE.Vector3().crossVectors(direction.clone(), objectsToClamp[0].up.clone())
    
    clampedInfo.position.add(panVector.setLength(pan))
    
    direction.setLength(Math.abs(pan))
    
    clampedInfo.target.sub(direction)
  }
  
  direction = clampedInfo.target.clone().sub(clampedInfo.position).normalize()
  
  return {
    direction,
    box,
    clampedInfo
  }
}

const getShotBox = (character, shotType = 0) => {
  let box = new THREE.Box3()
  
  if (!ShotSizesInfo[shotType]) {
    return box
  }
  
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
  let info = getShotInfo({
    objectsToClamp,
    shotSize,
    camera
  })
  
  camera.position.copy(info.clampedInfo.position)
  camera.lookAt(info.clampedInfo.target)
  camera.updateMatrixWorld(true)
  
  let rot = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ")
  
  updateObject(camera.userData.id, {
    x: camera.position.x,
    y: camera.position.z,
    z: camera.position.y,
    rotation: rot.y,
    roll: rot.z,
    tilt: rot.x
  })
}

const setShotAngle = ({
  camera,
  objectsToClamp,
  updateObject,
  shotAngle,
  shotSize
}) => {
  if (ShotAnglesInfo[shotAngle] === undefined || !ShotSizesInfo[shotSize]) {
    return false
  }
  
  let {clampedInfo, direction} = getShotInfo({
    objectsToClamp,
    shotSize,
    camera
  })
  
  let currentDistance = clampedInfo.position.distanceTo(clampedInfo.target)
  
  let mainAxis = new THREE.Vector3().crossVectors(camera.up, direction)
  
  let quaternion = new THREE.Quaternion()
  quaternion.setFromAxisAngle(mainAxis, -ShotAnglesInfo[shotAngle])
  
  direction.applyQuaternion(quaternion)
  direction.setLength(currentDistance)
  
  clampedInfo.position.copy(clampedInfo.target).sub(direction)
  
  camera.position.copy(clampedInfo.position)
  camera.lookAt(clampedInfo.target)
  camera.updateMatrixWorld(true)
  
  let rot = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ")

  updateObject(camera.userData.id, {
    x: camera.position.x,
    y: camera.position.z,
    z: camera.position.y,
    rotation: rot.y,
    roll: rot.z,
    tilt: rot.x
  })
  
}

module.exports = {
  ShotSizes,
  ShotAngles,
  setShotSize,
  setShotAngle
}
