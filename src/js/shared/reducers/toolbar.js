const initialState = {
  tools: {
    'light-pencil': {
      name: 'pencil',
      color: 0x000000,
      size: 2,
      opacity: 0.9,
      palette: []
    },
    'pencil': {
      name: 'pencil',
      color: 0x000000,
      size: 4,
      opacity: 0.9,
      palette: []
    },
    'pen': {
      name: 'pen',
      color: 0x000000,
      size: 4,
      opacity: 0.9,
      palette: []
    },
    'brush': {
      name: 'brush',
      color: 0x000000,
      size: 4,
      opacity: 0.9,
      palette: []
    },
    'note-pen': {
      name: 'note-pen',
      color: 0xff0000,
      size: 8,
      opacity: 0.9,
      palette: []
    },
    'eraser': {
      name: 'eraser',
      color: 0xffffff,
      size: 16,
      opacity: 1.0,
      palette: []
    }
  },
  prevTool: undefined,
  activeTool: undefined
}

const toolbar = (state = initialState, action) => {
  switch (action.type) {
    // TODO prevent update if getIsDrawingOrStabilizing ?
    case 'TOOLBAR_TOOL_CHANGE':
      return {
        ...state,
        activeTool: action.payload
      }
    case 'TOOLBAR_TOOL_QUICK_PUSH': {
      return {
        ...state,
        // remember the current tool if it's not an eraser
        prevTool: state.activeTool !== 'eraser' ? state.activeTool : state.prevTool,
        activeTool: action.payload
      }
    }
    case 'TOOLBAR_TOOL_QUICK_POP': {
      return {
        ...state,
        prevTool: undefined,
        // switch to last remembered tool (unless it's empty)
        activeTool: state.prevTool || state.activeTool
      }
    }
    case 'TOOLBAR_TOOL_SET':
      return state.activeTool == null
        ? state
        : {
          ...state,
          tools: {
            ...state.tools,
            [state.activeTool]: {
              ...state.tools[state.activeTool],
              size: action.payload.size || state.tools[state.activeTool].size,
              color: action.payload.color || state.tools[state.activeTool].color,
              opacity: action.payload.opacity || state.tools[state.activeTool].opacity
            }
          }
        }

    default:
      return state
  }
}

module.exports = toolbar
