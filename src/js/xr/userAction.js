
module.exports = function (action) {
  switch (action.type) {
    case 'UPDATE_CHARACTER_IK_SKELETON':
      action.payload.skeleton = action.payload.skeleton.map((bone) => {
        return {
          name: bone.name,
          rotation: {
            x: bone.rotation.x,
            y: bone.rotation.y,
            z: bone.rotation.z
          }
        }
      })
      break
  }
  
  
  return action
}
