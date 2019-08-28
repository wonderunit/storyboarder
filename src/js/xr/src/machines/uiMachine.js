const { Machine } = require('xstate')

const { log } = require('../components/Log')

const machine = Machine({
  id: 'ui',
  strict: true,
  initial: 'idle',
  context: {},
  states: {
    idle: {
      on: {
        'TRIGGER_START': {
          target: 'dragging'
        }
      }
    },
    dragging: {
      onEntry: 'onDraggingEntry',
      onExit: 'onDraggingExit',
      on: {
        'TRIGGER_END': {
          target: 'idle'
        },
        'CONTROLLER_INTERSECTION': {
          actions: 'drag'
        }
      }
    }
  }
})

module.exports = machine
