const { Machine } = require('xstate')
const { assign } = require('xstate/lib/actions')

const { log } = require('../components/Log')

const machine = Machine({
  id: 'ui',
  strict: true,
  type: 'parallel',
  context: {},
  states: {
    controls: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'TRIGGER_START': {
              actions: 'onTriggerStart'
            },
            'REQUEST_DRAG': 'dragging'
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
