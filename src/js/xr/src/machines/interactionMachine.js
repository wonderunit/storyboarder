const { Machine } = require('xstate')
const { assign } = require('xstate/lib/actions')

const machine = Machine({
  id: 'interactions',
  strict: true,
  initial: 'idle',
  context: {
    miniMode: false,
    snap: false,
    selection: null,
    controller: null
  },
  states: {
    idle: {
      on: {
        // idle always clears the selection if it is present
        '': {
          cond: 'selectionPresent',
          actions: ['clearController', 'clearSelection']
        },
        TRIGGER_START: {
          // skip immediately to the drag behavior
          target: 'drag_object',
          actions: ['updateController', 'updateSelection']
        },
        GRIP_DOWN: {
          target: 'drag_teleport'
        }
      }
    },
    selected: {
      on: {
        TRIGGER_START: [
          {
            target: 'idle',
            cond: 'selectionNil'
          },
          {
            target: 'drag_object',
            cond: 'controllerSameAndSelectionChanged',
            actions: ['updateController', 'updateSelection']
          },
          {
            target: 'drag_object',
            cond: 'controllerSameAndselectionSame'
          }
        ]
      }
    },
    drag_object: {
      on: {
        TRIGGER_END: 'selected'
      }
    },
    drag_teleport: {
      on: {
        TRIGGER_START: 'teleport',
        GRIP_UP: 'idle'
      }
    },
    teleport: {
      invoke: {
        src: 'teleport'
      },
      on: {
        '': 'drag_teleport',
      }
    }
  }
}, {
  actions: {
    // TODO simplify these
    updateSelection: assign({
      selection: (context, event) => event.id
    }),
    clearSelection: assign({
      selection: (context, event) => null
    }),

    updateController: assign({
      controller: (context, event) => event.controller.gamepad.id
    }),
    clearController: assign({
      controller: (context, event) => null
    })
  },
  guards: {
    // TODO simplify these
    selectionPresent: (context, event) => context.selection != null,
    selectionChanged: (context, event) => event.id !== context.selection,
    selectionSame: (context, event) => event.id === context.selection,
    selectionNil: (context, event) => event.id == null,

    controllerSame: (context, event) => event.controller.gamepad.id === context.controller,
    controllerChanged: (context, event) => event.controller.gamepad.id !== context.controller,

    controllerSameAndSelectionChanged: (context, event) =>
      (event.controller.gamepad.id === context.controller) &&
      (event.id !== context.selection),

    // :/
    controllerSameAndselectionSame: (context, event) =>
      (event.controller.gamepad.id === context.controller) &&
      (event.id === context.selection)
  }
})

module.exports = machine
