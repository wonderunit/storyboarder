const R = require('ramda')

const initialState = {
  tools: {
    'light-pencil': {
      name: 'light-pencil',
      color: 0x90CBF9,
      size: 20,
      opacity: 0.25,

      palette: [0x373737, 0x223131, 0x121212]
    },
    'brush': {
      name: 'brush',
      color: 0x90CBF9,
      size: 26,
      opacity: 0.7,
      palette: []
    },
    'tone': {
      name: 'tone',
      color: 0x162A3F,
      size: 50,
      opacity: 0.15,
      palette: []
    },
    'pencil': {
      name: 'pencil',
      color: 0x000000,
      size: 4,
      opacity: 0.45,
      palette: []
    },
    'pen': {
      name: 'pen',
      color: 0x000000,
      size: 2,
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
      size: 26,
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
              size: action.payload.size != null ? action.payload.size : state.tools[state.activeTool].size,
              color: action.payload.color != null ? action.payload.color : state.tools[state.activeTool].color,
              opacity: action.payload.opacity != null ? action.payload.opacity : state.tools[state.activeTool].opacity
            }
          }
        }

    case 'TOOLBAR_TOOL_PALETTE_CHANGE':
      return {
        ...state,
        tools: {
          ...state.tools,
          [action.payload.tool]: {
            ...state.tools[action.payload.tool],
            palette: action.payload.palette
          }
        }
      }

    case 'TOOLBAR_MERGE_FROM_PREFERENCES':
      return {
        ...state,
        tools: R.mergeDeepRight(state.tools, action.payload.toolbar.tools)
      }

    default:
      return state
  }
}

module.exports = toolbar
