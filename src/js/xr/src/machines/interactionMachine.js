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
    invoke: {
      src: 'onIdle'
    },
    idle: {
      on: {
        // idle always clears the selection if it is present
        '': {
          cond: 'selectionPresent',
          actions: ['clearController', 'clearSelection']
        },
        TRIGGER_START: {
          // skip immediately to the drag behavior
          cond: 'eventHasIntersection',
          target: 'drag_object',
          actions: ['updateController', 'updateSelection']
        },
        GRIP_DOWN: {
          target: 'drag_teleport',
          actions: ['updateController']
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
        TRIGGER_END: 'drag_object_end'
      }
    },
    drag_object_end: {
      invoke: {
        src: 'onDragObjectEnd'
      },
      on: {
        '': 'selected'
      }
    },
    drag_teleport: {
      invoke: {
        src: 'onDragTeleportStart'
      },
      on: {
        TRIGGER_START: 'teleport',
        GRIP_UP: 'end_drag_teleport'
      }
    },
    teleport: {
      invoke: {
        src: 'teleport'
      },
      on: {
        // keep dragging after a teleport
        '': 'drag_teleport'

        // uncomment to go idle after a teleport
        // '': 'idle'
      }
    },
    end_drag_teleport: {
      invoke: {
        src: 'onDragTeleportEnd'
      },
      on: {
        '': 'idle'
      }
    }
  }
}, {
  actions: {
    // TODO simplify these
    updateSelection: assign({
      selection: (context, event) => event.intersection.id
    }),
    clearSelection: assign({
      selection: (context, event) => null
    }),

    updateController: assign({
      controller: (context, event) => event.controller.gamepad.index
    }),
    clearController: assign({
      controller: (context, event) => null
    })
  },
  guards: {
    // TODO simplify these
    selectionPresent: (context, event) => context.selection != null,
    selectionChanged: (context, event) => event.intersection.id !== context.selection,
    selectionSame: (context, event) => event.intersection.id === context.selection,
    selectionNil: (context, event) => event.intersection == null,

    eventHasIntersection: (context, event) => {
      console.log('eventHasIntersection?', event)
      return event.intersection != null
    },

    controllerSame: (context, event) => event.controller.gamepad.index === context.controller,
    controllerChanged: (context, event) => event.controller.gamepad.index !== context.controller,

    controllerSameAndSelectionChanged: (context, event) =>
      (event.controller.gamepad.index === context.controller) &&
      (event.intersection.id !== context.selection),

    // :/
    controllerSameAndselectionSame: (context, event) =>
      (event.controller.gamepad.index === context.controller) &&
      (event.intersection.id === context.selection)
  }
})

module.exports = machine
