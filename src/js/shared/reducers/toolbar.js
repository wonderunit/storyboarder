const initialState = {
  tools: {
    'light-pencil': {
      brushName: 'pencil',
      brushColor: 0x000000,
      brushSize: 2,
      brushOpacity: 0.9,
      palette: []
    },
    'pencil': {
      brushName: 'pencil',
      brushColor: 0x000000,
      brushSize: 4,
      brushOpacity: 0.9,
      palette: []
    },
    'pen': {
      brushName: 'pen',
      brushColor: 0x000000,
      brushSize: 4,
      brushOpacity: 0.9,
      palette: []
    },
    'brush': {
      brushName: 'brushpen',
      brushColor: 0x000000,
      brushSize: 4,
      brushOpacity: 0.9,
      palette: []
    },
    'note-pen': {
      brushName: 'copic',
      brushColor: 0xff0000,
      brushSize: 8,
      brushOpacity: 0.9,
      palette: []
    },
    'eraser': {
      brushName: 'copic',
      brushColor: 0xffffff,
      brushSize: 16,
      brushOpacity: 1.0,
      palette: []
    }
  },
  activeTool: 'light-pencil'
}

const toolbar = (state = initialState, action) => {
  switch (action.type) {
    // TODO prevent update if getIsDrawingOrStabilizing ?
    case 'TOOLBAR_TOOL_CHANGE':
      return {
        ...state,
        activeTool: action.payload
      }

    default:
      return state
  }
}

module.exports = toolbar
