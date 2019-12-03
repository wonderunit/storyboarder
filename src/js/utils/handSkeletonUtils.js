const createdMirroredHand = (originalSkeleton, mirroredHandName) => {
    let oppositeSkeleton = {}
    let oppositeHand = getOppositeHandName(mirroredHandName)
    let keys = Object.keys(originalSkeleton)
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i]
      let newKey = key.replace(mirroredHandName, oppositeHand)
      let boneRot = originalSkeleton[key].rotation
      let mirroredEuler = new THREE.Quaternion().setFromEuler(new THREE.Euler(boneRot.x, boneRot.y, boneRot.z))
      mirroredEuler.x *= -1
      mirroredEuler.w *= -1
      let euler = new THREE.Euler().setFromQuaternion(mirroredEuler)
      oppositeSkeleton[newKey] = {rotation : {x: euler.x, y: euler.y, z: euler.z }} 
    }
    return oppositeSkeleton
} 

const applyChangesToSkeleton = (skeletonToApplyTo, changedSkeleton) => {
    let keys = Object.keys(changedSkeleton)
    let newSkeleton = {}
    Object.assign(newSkeleton, skeletonToApplyTo)
    for(let i = 0; i < keys.length; i++) {
      let key = keys[i]
      newSkeleton[key] = changedSkeleton[key] 
    }
    return newSkeleton
}


const getOppositeHandName = handName => {
    return handName === "RightHand" ? "LeftHand" : "RightHand"
  }

module.exports = {createdMirroredHand, applyChangesToSkeleton, getOppositeHandName }