const { Machine, assign } = require('xstate')

const { log } = require('../components/Log')

const machine = Machine({
  id: 'ui',
  strict: true,
  type: 'parallel',
  context: {},
  states: {
    controls: {
      initial: 'home',
      states: {
        home: {
          on: {
            'GO_ADD': 'add',
            'TOGGLE_SETTINGS': 'settings',
            'GO_PROPERTIES': 'properties'
          }
        },
        add: {
          on: {
            'GO_HOME': 'home',
            'TOGGLE_SETTINGS': 'settings'
          }
        },
        settings: {
          on: {
            'GO_HOME': 'home',
            'GO_ADD': 'add',
            'TOGGLE_SETTINGS': 'home',

          }
        },
        properties: {
          on: {
            'GO_ADD': 'add',
            'GO_HOME': 'home',
            'TOGGLE_SETTINGS': 'settings',
          }
        }
      }
    },
    input: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'TRIGGER_START': {
              actions: 'onTriggerStart'
            },
            'REQUEST_DRAG': 'dragging',
            'ADD_OBJECT': { actions: 'onAddObject' },
            'REQUEST_DUPLICATE': { actions: 'onDuplicate' },
            'REQUEST_DELETE': { actions: 'onDelete' },
            'TOGGLE_SWITCH': { actions: 'onToggleSwitch' }
          }
        },
        dragging: {
          onEntry: ['updateSelection', 'updateDraggingController', 'onDraggingEntry'],
          onExit: ['clearSelection', 'clearDraggingController', 'onDraggingExit'],
          on: {
            'TRIGGER_END': {
              target: 'idle'
            },
            'CONTROLLER_INTERSECTION': {
              actions: 'onDrag'
            }
          }
        }
      }
    }
  }
}, {
  actions: {
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
