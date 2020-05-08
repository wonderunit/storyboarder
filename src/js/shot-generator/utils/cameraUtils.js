import * as THREE from 'three'

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

const DefaultLenses = [
    22,
    35,
    50,
    85,
    120
]

const ShotSizes = {
  EXTREME_CLOSE_UP: 'Extremely close up',
  VERY_CLOSE_UP: 'Very close up',
  CLOSE_UP: 'Close up',
  MEDIUM_CLOSE_UP: 'Medium close up',
  BUST: 'Bust',
  MEDIUM: 'Medium',
  MEDIUM_LONG: 'Medium long',
  LONG: 'Long',
  EXTREME_LONG: 'Extremely long',
  ESTABLISHING: 'Establishing',
  OTS_LEFT: 'OTS Left',
  OTS_RIGHT: 'OTS Right',
}

const ShotAngles = {
  BIRDS_EYE: 'Birds',
  HIGH: 'High',
  EYE: 'Eye',
  LOW: 'Low',
  WORMS_EYE: 'Worms'
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

const getShotInfo = ({
  selected,
  characters,
  shotSize,
  camera
}) => {
  let direction = new THREE.Vector3()
  camera.getWorldDirection(direction)
  direction.negate()
  
  let box = getShotBox(selected, shotSize)
  if (shotSize === ShotSizes.ESTABLISHING) {
    for (let i = 0; i < characters.length; i++) {
      box.expandByObject(characters[i])
    }
    
    if (characters.length > 1) {
      direction = new THREE.Vector3()
      
      for (let i = 0; i < characters.length - 1; i += 2) {
        direction.add(characters[i + 1].position.clone().sub(characters[i].position.clone()))
      }
      
      direction.divideScalar(characters.length)
      
      direction = camera.position.clone().sub(direction)
      direction.y = camera.y
    }
  } else if (!ShotSizesInfo[shotSize]) {
    let center = new THREE.Vector3()
    box.getCenter(center)
  
    
    
    return {
      clampedInfo: {
        position: camera.position.clone(),
        target: center,
      },
      direction: direction.negate(),
      box
    }
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
    
    let panVector = new THREE.Vector3().crossVectors(direction.clone(), selected.up.clone())
    
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
  
  /** If shot isn't provided, use eyes to calculate shot angle */
  if (!ShotSizesInfo[shotType]) {
    let skinnedMesh = character.getObjectByProperty("type", "SkinnedMesh")
    let bone = skinnedMesh.skeleton.bones.find((bone) => bone.name === 'leaf')
    
    let boneInfo = getBoneStartEndPos(bone)
    box.expandByPoint(boneInfo.start)
    box.expandByPoint(boneInfo.end)
    
    return box
  }
  
  let shotInfo = ShotSizesInfo[shotType]
  let skinnedMesh = character.getObjectByProperty("type", "SkinnedMesh")
  let bones = skinnedMesh.skeleton.bones.filter((bone) => shotInfo.bones.indexOf(bone.name) !== -1)
  
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

const getClosestCharacter = (characters, camera) => {
  let resultAngle = Math.PI
  let resultDistance = Infinity
  let resultObject = null
  
  let cameraDir = new THREE.Vector3()
  camera.getWorldDirection(cameraDir)
  
  characters.forEach((target) => {
    let charDir = new THREE.Vector3()
    target.getWorldDirection(charDir)
    
    let dist = camera.position.distanceTo(target.position)
    let angle = charDir.clone().dot(cameraDir)
    
    let frustum = new THREE.Frustum().setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
    let visible = frustum.containsPoint(target.position)
    
    if ((angle >= 1.0 || angle <= 0.0) && dist <= resultDistance && visible) {
      resultAngle = angle
      resultDistance = dist
      resultObject = target
    }
  })
  
  if (!resultObject) {
    return characters[0]
  }
  
  return resultObject
}

const setShot = ({
  camera,
  characters,
  selected,
  scene,
  updateObject,
  shotAngle,
  shotSize
}) => {
  let {clampedInfo, direction, box} = getShotInfo({
    selected: selected || getClosestCharacter(characters, camera),
    characters,
    shotSize,
    camera
  })
  
  if (ShotAnglesInfo[shotAngle] !== undefined) {
    let currentDistance = clampedInfo.position.distanceTo(clampedInfo.target)
  
    direction.y = 0
    direction.normalize()
    let mainAxis = new THREE.Vector3().crossVectors(camera.up, direction)
  
    let quaternion = new THREE.Quaternion()
    quaternion.setFromAxisAngle(mainAxis, -ShotAnglesInfo[shotAngle])
    
    direction.applyQuaternion(quaternion)
    direction.setLength(currentDistance)
  
    clampedInfo.position.copy(clampedInfo.target).sub(direction)
  }
  
  if (clampedInfo.position.y < 0) {
    clampedInfo.position.sub(direction.clone().setY(0).setLength(clampedInfo.position.y))
    clampedInfo.position.y = 0
  }
  
  camera.position.copy(clampedInfo.position)
  camera.lookAt(clampedInfo.target)
  camera.updateMatrixWorld(true)
  
  let rot = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ")
  updateObject && updateObject(camera.userData.id, {
    x: camera.position.x,
    y: camera.position.z,
    z: camera.position.y,
    rotation: rot.y,
    roll: rot.z,
    tilt: rot.x
  })
  return box
}

export {
  ShotSizes,
  ShotAngles,
  setShot
}
