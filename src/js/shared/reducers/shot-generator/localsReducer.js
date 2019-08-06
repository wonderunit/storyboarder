const { produce } = require('immer')

const initialState = {
  // teleport: {
  //   id: 'teleport',
  //   type: 'cursor',
  //   label: 'teleport',
  //   position: [0, 0, 0],
  //   rotation: [0, 0, 0]
  // },
  // display: {
  //   id: 'display',
  //   type: 'cursor',
  //   label: 'hmd',
  //   position: [0, 0, 0],
  //   rotation: [0, 0, 0]
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
