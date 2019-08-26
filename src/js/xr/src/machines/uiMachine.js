const { Machine } = require('xstate')

const { log } = require('../components/Log')

const machine = Machine({
  id: 'ui',
  strict: true,
  initial: 'idle',
  context: {
  },
  states: {
    idle: {
      on: {
        'TRIGGER_START': {
          target: 'drawing',
          actions: 'trigger'
        }
      }
    },
    drawing: {
      onEntry: 'onDrawingEntry',
      onExit: 'onDrawingExit',
      on: {
        'TRIGGER_END': {
          target: 'idle'
        }
      }
    }
  }
})

module.exports = machine
