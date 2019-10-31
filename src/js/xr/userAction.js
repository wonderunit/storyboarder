
const DISABLED_ACTIONS = {
  SELECT_OBJECT: true,
  SELECT_OBJECT_TOGGLE: true
}

function userAction (action) {
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
    case 'ATTACHMENTS_SUCCESS':
      action.payload = JSON.parse(JSON.stringify(action.payload))
      break
  }
  
  
  return action
}

module.exports = {
  userAction,
  DISABLED_ACTIONS
}
