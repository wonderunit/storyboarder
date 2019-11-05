const {produce} = require("immer")

const DISABLED_ACTIONS = {
  SELECT_OBJECT: true,
  SELECT_OBJECT_TOGGLE: true,
  ATTACHMENTS_PENDING: true,
  ATTACHMENTS_LOAD: true,
  ATTACHMENTS_SUCCESS: true,
  ATTACHMENTS_ERROR: true,
  ATTACHMENTS_DELETE: true
}

function userAction (action) {
  return produce(action, draft => {
    switch (action.type) {
      case 'UPDATE_CHARACTER_IK_SKELETON':
        draft.payload.skeleton = action.payload.skeleton.map((bone) => {
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
        draft.payload = JSON.parse(JSON.stringify(action.payload))
        break
    }
  })
}

module.exports = {
  userAction,
  DISABLED_ACTIONS
}
