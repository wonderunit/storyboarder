const { Machine, assign, send } = require('xstate')
const { equals } = require('ramda')

const groupByPage = require('../../exporters/pdf/group-by-page')

const {
  getTemporaryFilepath,
  getExportFilepath,
  toPresetMemento
} = require('./context-helpers')

const specs = {
  paperSize: {
    'a4': [841.89, 595.28],
    'letter': [792.0, 612.0]
  },
  rows: [1, 10],
  columns: [1, 10],
  boardTextSize: [6, 16]
}

const getPaperSize = (key, orientation) => {
  let size = specs.paperSize[key]

  let portrait = (a, b) => a - b
  let landscape = (a, b) => b - a

  switch (orientation) {
    case 'portrait':
      return size.sort(portrait)
    case 'landscape':
      return size.sort(landscape)
  }
}

// find matching system preset (if any) given current user context
const findMatchingPresetIdForContext = (list, context) => {
  // given the current user context converted to a preset memento …
  let contextAsPreset = toPresetMemento(context)
  // … does it match an existing system preset?
  let match = Object.entries(list)
    .find(([id, { data }]) => equals(contextAsPreset, data))
  // return id of match, if any, or null
  return match ? match[0] : null
}

const initialContext = {
  paperSizeKey: 'a4',
  
  pages: [0, 0],
  pageToPreview: 0,

  filepath: getTemporaryFilepath(),

  selectedPresetId: null,

  rotation: 0
}

/*
 * assigners
*/
const createHeaderStatsAssigner = name => (context, event) => ({
  ...context,
  header: {
    ...context.header,
    stats: {
      ...context.header.stats,
      [name]: event.value
    }
  }
})

const gridRowsAssigner = ({ gridDim }, { value }) => ({
  gridDim: [value, gridDim[1]]
})

const gridColumnsAssigner = ({ gridDim }, { value }) => ({
  gridDim: [gridDim[0], value]
})

const pagesAssigner = (context, event) => {
  let { gridDim, project } = context
  let [rows, columns] = gridDim

  // TODO to improve performance, only calculate total number of pages
  let groups = groupByPage(project.scenes, rows * columns)

  return {
    pages: [0, groups.length - 1],
    pageToPreview: context.pageToPreview <= groups.length - 1
      ? context.pageToPreview
      : groups.length - 1
  }
}

const createPageToPreviewAssigner = delta => (context, event) => {
  let { pageToPreview, pages: [_, endIndex] } = context
  let size = endIndex + 1
  return {
    pageToPreview: (pageToPreview + delta + size) % size
  }
}

const temporaryFilepathAssigner = (context, event) => ({
  filepath: getTemporaryFilepath(context, event)
})

const exportFilepathAssigner = (context, event) => ({
  filepath: getExportFilepath(context, event)
})

const selectedPresetIdFromContextAssigner = (context, event) => {
  let id = findMatchingPresetIdForContext(context.presets, context)
  return {
    selectedPresetId: id != null ? id : null
  }
}

// paperSize depends on paperSizeKey and orientation
const paperSizeAssigner = (context, event) => ({
  paperSize: getPaperSize(context.paperSizeKey, context.orientation)
})

/*
 * guards
*/
const presetExists = (context, event) => context.presets[event.value] != undefined

/*
 * actions for preview canvas replacement and conditional random rotation
 */
const isNotPageTurningEvent = event => !event.type.match(/_PAGE_TO_PREVIEW$/)

const rotationAssigner = (context, event) => {
  if (isNotPageTurningEvent(event)) {
    return {
      rotation: ((Math.random() * 4) - 2)
    }
  }
}

// TODO avoid storing canvas reference in context
const renderNewCanvasAssigner = (context, event) => {
  let newCanvas = event.data
  context.canvas.parentNode.replaceChild(newCanvas, context.canvas)
  return {
    canvas: newCanvas
  }
}

const renderRotation = (context, event) => {
  // lol
  context.canvas.parentNode.style.transform = 'rotate3d(1, 0, 1, ' + context.rotation + 'deg)'
}

const machine = Machine({
  id: 'print-project',
  context: initialContext,
  initial: 'loading',
  states: {
    loading: {
      entry: [
        assign(pagesAssigner),
        assign(selectedPresetIdFromContextAssigner),
        assign(paperSizeAssigner)
      ],
      on: {
        'CANVAS_READY': {
          // hidden by default, until first render
          actions: 'hidePreviewDisplay'
        },
        'EDITOR_READY': {
          target: 'busy'
        }
      }
    },
    available: {
      id: 'available',
      initial: 'idle',
      entry: [assign(pagesAssigner)],
      states: {
        idle: {
        },
        debouncing: {
          entry: assign(selectedPresetIdFromContextAssigner),
          after: {
            1100: {
              target: 'updating'
            }
          }
        },
        updating: {
          always: {
            target: '#busy.generating',
            actions: assign(temporaryFilepathAssigner)
          }
        },
      },
      on: {
        'EXPORT': {
          target: 'busy.exporting',
          actions: assign(exportFilepathAssigner)
        },
        'PRINT': {
          target: 'busy.printing',
          actions: assign(temporaryFilepathAssigner)
        },

        'SET_PAPER_SIZE_KEY': [
          {
            actions: [
              assign((context, event) => ({
                paperSizeKey: event.value
              })),
              assign(paperSizeAssigner),
              'persist'
            ],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_SELECTED_PRESET_BY_ID': [
          {
            actions: [
              // merge data from preset into context
              assign((context, event) => {
                let selectedPresetId = event.value
                let memento = context.presets[selectedPresetId].data
                return {
                  // set the id
                  selectedPresetId,
                  // merge the preset data
                  ...memento
                }
              }),
              assign(paperSizeAssigner),
              'persist'
            ],
            target: '.updating',
            internal: false,
            cond: presetExists
          }
        ],
        'SET_ORIENTATION': [
          {
            actions: [
              assign((context, event) => ({
                orientation: event.value
              })),
              assign(paperSizeAssigner),
              'persist'
            ],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_GRID_ROWS': [
          {
            actions: [assign(gridRowsAssigner), assign(pagesAssigner), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_GRID_COLUMNS': [
          {
            actions: [assign(gridColumnsAssigner), assign(pagesAssigner), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_DIRECTION': [
          {
            actions: [assign({ direction: (_, { value }) => value }), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_ENABLE_DIALOGUE': [
          {
            actions: [assign({ enableDialogue: (_, { value }) => value }), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_ENABLE_ACTION': [
          {
            actions: [assign({ enableAction: (_, { value }) => value }), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_ENABLE_NOTES': [
          {
            actions: [assign({ enableNotes: (_, { value }) => value }), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_ENABLE_SHOT_NUMBER': [
          {
            actions: [assign({ enableShotNumber: (_, { value }) => value }), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_BOARD_TIME_DISPLAY': [
          {
            actions: [assign({ boardTimeDisplay: (_, { value }) => value }), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_BOARD_TEXT_SIZE': {
          actions: [assign({ boardTextSize: (_, { value }) => value }), 'persist'],
          target: '.debouncing',
          internal: false
        },
        'SET_BOARD_BORDER_STYLE': {
          actions: [assign({ boardBorderStyle: (_, { value }) => value }), 'persist'],
          target: '.debouncing',
          internal: false
        },


        'SET_HEADER_STATS_BOARDS': [
          {
            actions: [assign(createHeaderStatsAssigner('boards')), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_HEADER_STATS_SHOTS': [
          {
            actions: [assign(createHeaderStatsAssigner('shots')), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_HEADER_STATS_SCENE_DURATION': [
          {
            actions: [assign(createHeaderStatsAssigner('sceneDuration')), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_HEADER_STATS_ASPECT_RATIO': [
          {
            actions: [assign(createHeaderStatsAssigner('aspectRatio')), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],
        'SET_HEADER_STATS_DATE_EXPORTED': [
          {
            actions: [assign(createHeaderStatsAssigner('dateExported')), 'persist'],
            target: '.debouncing',
            internal: false
          }
        ],

        'INCREMENT_PAGE_TO_PREVIEW': [
          {
            actions: [
              assign(createPageToPreviewAssigner(+1)),
              assign(temporaryFilepathAssigner)
            ],
            target: '#busy.generating',
            internal: false,
            cond: 'hasMultiplePages'
          }
        ],
        'DECREMENT_PAGE_TO_PREVIEW': [
          {
            actions: [
              assign(createPageToPreviewAssigner(-1)),
              assign(temporaryFilepathAssigner)
            ],
            target: '#busy.generating',
            internal: false,
            cond: 'hasMultiplePages'
          }
        ]
      }
    },
    busy: {
      id: 'busy',
      initial: 'generating',
      states: {
        generating: {
          entry: assign(rotationAssigner),
          invoke: {
            src: 'generateToCanvas',
            onDone: {
              target: '#available',
              actions: [
                assign(renderNewCanvasAssigner),
                renderRotation,
                'showPreviewDisplay'
              ]
            },
            onError: {
              target: '#warning'
            }
          }
        },
        exporting: {
          invoke: {
            src: 'exportToFile',
            onDone: {
              target: '#available',
              actions: [
                'showItemInFolder',
                'reportAnalyticsEvent'
              ]
            },
            onError: {
              target: '#warning'
            }
          },
        },
        printing: {
          invoke: {
            src: 'requestPrint',
            onDone: {
              actions: [
                'reportAnalyticsEvent',
                send('CLOSE')
              ]
            },
            onError: {
              target: '#warning'
            }
          }
        }
      }
    },
    warning: {
      id: 'warning',
      invoke: {
        src: 'displayWarning',
        onDone: '#available'
      }
    },
    finished: {
      type: 'final'
    }
  },
  on: {
    'CLOSE': 'finished'
  }
}, {
  guards: {
    hasMultiplePages: (context, event) => context.pages[1] > 1
  }
})

module.exports = { specs, machine }
