let ikBonesName = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", 
                  "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", 
                  "RightShoulder", "RightArm", "RightForeArm", "RightHand",
                  "LeftUpLeg", "LeftLeg", "LeftFoot",
                  "RightUpLeg", "RightLeg", "RightFoot"]
const isSuitableForIk = (skeleton) => {
  //let isSuitable = true
  let foundBones = []
  for(let i = 0; i < skeleton.bones.length; i++) {
    let bone = skeleton.bones[i]
    let ikBoneName = ikBonesName.filter(name => bone.name.includes(name))[0]
    if(ikBoneName) {
      foundBones.push(ikBoneName)
      let indexOf = ikBonesName.indexOf(ikBoneName)
      ikBonesName.splice(indexOf, 1)
      bone.name = ikBoneName
      bone.userData.name = ikBoneName
    } 
  }
  let isSuitable = ikBonesName.length === 0
  ikBonesName = ikBonesName.concat(foundBones)
  return isSuitable
}

module.exports = isSuitableForIk
