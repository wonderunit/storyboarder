const R = require('ramda')

const initialState = {
  tools: {
    'light-pencil': {
      name: 'light-pencil',
      color: 0x90CBF9,
      size: 20,
      opacity: 0.25,

      palette: [0xCFCFCF, 0x9FA8DA, 0x90CBF9],

      defaultLayerName: 'reference'
    },
    'brush': {
      name: 'brush',
      color: 0x90CBF9,
      size: 26,
      opacity: 0.7,
      palette: [0x4DABF5, 0x607D8B, 0x9E9E9E],

      defaultLayerName: 'fill'
    },
    'tone': {
      name: 'tone',
      color: 0x162A3F,
      size: 50,
      opacity: 0.15,
      palette: [0x162A3F, 0x162A3F, 0x162A3F],

      defaultLayerName: 'tone'
    },
    'pencil': {
      name: 'pencil',
      color: 0x121212,
      size: 4,
      opacity: 0.45,
      palette: [0x373737, 0x223131, 0x121212],

      defaultLayerName: 'pencil'
    },
    'pen': {
      name: 'pen',
      color: 0x000000,
      size: 2,
      opacity: 0.9,
      palette: [0x373737, 0x223131, 0x000000],

      defaultLayerName: 'ink'
    },
    'note-pen': {
      name: 'note-pen',
      color: 0xF44336,
      size: 8,
      opacity: 0.9,
      palette: [0x4CAF50, 0xFF9800, 0xF44336],

      defaultLayerName: 'notes'
    },
    'eraser': {
      name: 'eraser',
      color: 0xffffff,
      size: 26,
      opacity: 1.0,
      palette: [0xffffff, 0xffffff, 0xffffff],

      defaultLayerName: undefined
    }
  },

  captions: false,

  grid: false,
  center: false,
  thirds: false,
  perspective: false,

  onion: false,

  prevTool: undefined,
  activeTool: undefined,

  // drawing, moving, scaling
  mode: undefined,

  // busy, idle
  modeStatus: 'idle'
}

const updateBrushSize = (size, direction, fine = false) => {
  let min = 1
  let max = 256

  if (fine) {
    size += direction
  } else {
    if (size < 5) {
      size += direction
    } else {
      size *= direction > 0 ? 1.2 : 0.8
    }
  }
  
  return Math.min(Math.max(size, min), max)
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
      return {
        ...state,
        tools: {
          ...state.tools,
          [state.activeTool]: {
            ...state.tools[state.activeTool],
            size: updateBrushSize(state.tools[state.activeTool].size, +1, action.payload.fine)
          }
        }
      }

    case 'TOOLBAR_BRUSH_SIZE_DEC':
      return {
        ...state,
        tools: {
          ...state.tools,
          [state.activeTool]: {
            ...state.tools[state.activeTool],
            size: updateBrushSize(state.tools[state.activeTool].size, -1, action.payload.fine)
          }
        }
      }

    case 'TOOLBAR_GUIDE_TOGGLE':
      return {
        ...state,
        [action.payload]: !state[action.payload]
      }

    case 'TOOLBAR_CAPTIONS_TOGGLE':
      return {
        ...state,
        captions: !state.captions
      }

    case 'TOOLBAR_ONION_TOGGLE':
      return {
        ...state,
        onion: !state.onion
      }

    case 'TOOLBAR_MODE_SET':
      return {
        ...state,
        // only allow change if currently idle
        mode: state.modeStatus === 'idle' ? action.payload : state.mode
      }

    case 'TOOLBAR_MODE_STATUS_SET':
      return {
        ...state,
        modeStatus: action.payload
      }

    default:
      return state
  }
}

module.exports = toolbar
