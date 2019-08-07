const { produce } = require('immer')

const initialState = {
  // teleport: {
  //   id: 'teleport',
  //   type: 'cursor',
  //   label: 'teleport',
  //   position: { x: 1, y: 0, z: 1},
  //   rotation: { x: 0, y: 0, z: 0}
  // },
  // display: {
  //   id: 'display',
  //   type: 'cursor',
  //   label: 'hmd',
  //   position: { x: 0.5, y: 0, z: 0},
  //   rotation: { x: 0, y: 0, z: 0}
  // }
}

const reducer = (state = initialState, action = {}) => {
  return produce(state, draft => {
    switch (action.type) {
      // case 'CREATE_LOCAL':
      //   draft[action.payload.id] = action.payload
      //   return
      case 'UPDATE_LOCAL':
        draft[action.payload.id] = {
          ...draft[action.payload.id],
          ...action.payload
        }
        return
      // case 'DELETE_LOCAL':
      //   delete draft[action.payload.id]
      //   return
    }
  })
}

module.exports = {
  reducer
}
