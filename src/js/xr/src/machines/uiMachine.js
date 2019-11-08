const { Machine, assign } = require('xstate')

const { log } = require('../components/Log')

const machine = Machine({
  id: 'ui',
  strict: true,
  type: 'parallel',
  context: {
    selection: null,
    locked: false
  },
  states: {
    controls: {
      initial: 'home',
      states: {
        home: {
          on: {
            'GO_ADD': 'add',
            'GO_PROPERTIES': 'properties'
          }
        },
        add: {
          on: {
            'GO_HOME': 'home',
            'GO_PROPERTIES': 'properties'
          }
        },
        settings: {
          on: {
            'GO_HOME': 'home',
            'GO_ADD': 'add'
          }
        },
        properties: {
          on: {
            'GO_ADD': 'add',
            'GO_HOME': 'home',
            'TOGGLE_GRID': 'grid',
          }
        },
        grid: {
          on: {
            'GO_ADD': 'add',
            'GO_HOME': 'home'
          }
        }
      }
    },
    input: {
      initial: 'idle',
      states: {
        idle: {
          '': {
            cond: 'selectionPresent',
            actions: ['clearSelection',]
          },
          on: {
            'TRIGGER_START': {
              actions: 'onTriggerStart'
            },
            'REQUEST_DRAG': 'dragging',
            'ADD_OBJECT': { actions: 'onAddObject' },
            'REQUEST_DUPLICATE': { actions: 'onDuplicate' },
            'REQUEST_DELETE': { actions: 'onDelete' },
            'TOGGLE_SWITCH': { actions: 'onToggleSwitch' },
            'TOGGLE_HELP': { actions: 'onToggleHelp' },
            'INCREMENT_HELP': { actions: 'onIncrementHelp' },
            'SAVE_BOARD': { actions: 'onSaveBoard' },
            'INSERT_BOARD': { actions: 'onInsertBoard' },
            'CHANGE_BOARD': { actions: 'onChangeBoard' },
            'SET_BOARDUID': { actions: 'onSetBoardUid' },
            'TOGGLE_HUD': { actions: 'onToggleHUD' },
            'TOGGLE_SETTINGS': { actions: 'onToggleSettings' },
          }
        },
        locked: {
          onEntry: 'lock',
          onExit: 'unlock',
          on: {
            UNLOCK: 'idle'
          }
        },
        dragging: {
          onEntry: ['updateSelection', 'updateDraggingController', 'onDraggingEntry'],
          onExit: ['onDraggingExit', 'clearDraggingController'],
          on: {
            'TRIGGER_END': {
              target: 'idle'
            },
            'CONTROLLER_INTERSECTION': {
              actions: 'onDrag'
            }
          }
        },
        hidden : {
          onEntry: ['hideUI', 'onHideUI'],
          onExit: ['showUI','onShowUI'],
          on: {
            SHOW: 'idle'
          }
        }
      },
      on: {
        LOCK: '.locked',
        HIDE: '.hidden'
      }
    }
  }
}, {
  guards: {
    locked: (context, event) => context.locked === true,
    unlocked: (context, event) => context.locked === false,
    selectionPresent: (context, event) => context.selection != null
  },
  actions: {
    lock: assign({
      locked: (context, event) => true
    }),
    unlock: assign({
      locked: (context, event) => false
    }),
    hideUI: assign({
      isUIHidden: (context, event) => true
    }),
    showUI: assign({
      isUIHidden: (context, event) => false
    }),

    updateSelection: assign({
      selection: (context, event) => event.id
    }),
    clearSelection: assign({
      selection: (context, event) => null
    }),

    updateDraggingController: assign({
      draggingController: (context, event) => event.controller
    }),
    clearDraggingController: assign({
      draggingController: (context, event) => null
    })
  }
})

module.exports = machine
