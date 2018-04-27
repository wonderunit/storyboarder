const R = require('ramda')

const initialState = {
  tools: {
    'light-pencil': {
      name: 'light-pencil',
      color: 0x90CBF9,
      size: 20,
      opacity: 0.25,

      palette: [0xCFCFCF, 0x9FA8DA, 0x90CBF9]
    },
    'brush': {
      name: 'brush',
      color: 0x90CBF9,
      size: 26,
      opacity: 0.7,
      palette: [0x4DABF5, 0x607D8B, 0x9E9E9E]
    },
    'tone': {
      name: 'tone',
      color: 0x162A3F,
      size: 50,
      opacity: 0.15,
      palette: [0x162A3F, 0x162A3F, 0x162A3F]
    },
    'pencil': {
      name: 'pencil',
      color: 0x121212,
      size: 4,
      opacity: 0.45,
      palette: [0x373737, 0x223131, 0x121212]
    },
    'pen': {
      name: 'pen',
      color: 0x000000,
      size: 2,
      opacity: 0.9,
      palette: [0x373737, 0x223131, 0x000000]
    },
    'note-pen': {
      name: 'note-pen',
      color: 0xF44336,
      size: 8,
      opacity: 0.9,
      palette: [0x4CAF50, 0xFF9800, 0xF44336]
    },
    'eraser': {
      name: 'eraser',
      color: 0xffffff,
      size: 26,
      opacity: 1.0,
      palette: [0xffffff, 0xffffff, 0xffffff]
    }
  },

  captions: false,

  grid: false,
  center: false,
  thirds: false,
  perspective: false,

  onion: false,

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
    case 'TOOLBAR_TOOL_PALETTE_SET':
      return {
        ...state,
        tools: {
          ...state.tools,
          [state.activeTool]: {
            ...state.tools[state.activeTool],
            palette: R.update(
              action.payload.index,
              action.payload.color,
              state.tools[state.activeTool].palette
            )
          }
        }
      }

    case 'TOOLBAR_MERGE_FROM_PREFERENCES':
      return {
        ...state,
        tools: R.mergeDeepRight(state.tools, action.payload.toolbar.tools),
        captions: action.payload.toolbar.captions != null ? action.payload.toolbar.captions : state.captions
      }

    case 'TOOLBAR_BRUSH_SIZE_INC':
      const TOOLBAR_MAX_SIZE = 256
      return {
        ...state,
        tools: {
          ...state.tools,
          [state.activeTool]: {
            ...state.tools[state.activeTool],
            size: Math.min(TOOLBAR_MAX_SIZE, state.tools[state.activeTool].size * 1.2)
          }
        }
      }

    case 'TOOLBAR_BRUSH_SIZE_DEC':
      const TOOLBAR_MIN_SIZE = 1
      return {
        ...state,
        tools: {
          ...state.tools,
          [state.activeTool]: {
            ...state.tools[state.activeTool],
            size: Math.max(TOOLBAR_MIN_SIZE, state.tools[state.activeTool].size * 0.8)
          }
        }
      }

    default:
      return state
  }
}

module.exports = toolbar
