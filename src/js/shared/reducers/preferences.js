const initialState = {
  toolbar: {
    tools: {
      'light-pencil': {
        color: undefined,
        palette: undefined,
        strokeOpacity: undefined
      },
      'brush': {
        color: undefined,
        palette: undefined,
        strokeOpacity: undefined
      },
      'tone': {
        color: undefined,
        palette: undefined,
        strokeOpacity: undefined
      },
      'pencil': {
        color: undefined,
        palette: undefined,
        strokeOpacity: undefined
      },
      'pen': {
        color: undefined,
        palette: undefined,
        strokeOpacity: undefined
      },
      'note-pen': {
        color: undefined,
        palette: undefined,
        strokeOpacity: undefined
      },
      'eraser': {
        color: undefined,
        palette: undefined,
        strokeOpacity: undefined
      }
    },
    // guides: {
    //   grid: undefined,
    //   center: undefined,
    //   thirds: undefined,
    //   perspective: undefined
    // },
    // onion: undefined,
    captions: undefined
  }
}

const preferences = (state = initialState, action) => {
  switch (action.type) {
    case 'PREFERENCES_MERGE_FROM_TOOLBAR':
      let tools = {}
      // for every tool we know of
      for (let name of Object.keys(initialState.toolbar.tools)) {
        // if we were given new values
        if (action.payload.tools[name]) {
          // copy only the color, palette, and strokeOpacity
          tools[name] = {

            color: action.payload.tools[name].color != null
              ? action.payload.tools[name].color
              : initialState.toolbar.tools[name].color,

            palette: action.payload.tools[name].palette != null
              ? action.payload.tools[name].palette
              : initialState.toolbar.tools[name].palette,

            strokeOpacity: action.payload.tools[name].strokeOpacity != null
              ? action.payload.tools[name].strokeOpacity
              : initialState.toolbar.tools[name].strokeOpacity
          }
        } else {
          // otherwise, use the old value
          tools[name] = initialState.toolbar.tools[name]
        }
      }
      return {
        ...state,
        toolbar: {
          tools: tools,
          // guides: {
          //   ...state.toolbar.guides,
          //   ...action.payload.guides
          // },
          // onion: action.payload.guides != null ? action.payload.guides : state.toolbar.guides,

          // if `captions` is present in the toolbar payload
          captions: action.payload.captions != null
            // use it
            ? action.payload.captions
            // otherwise, preserve current value
            : state.toolbar.captions
        }
      }

    default:
      return state
  }
}

module.exports = preferences
