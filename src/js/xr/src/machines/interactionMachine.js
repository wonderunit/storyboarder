const { Machine } = require('xstate')
const { assign } = require('xstate/lib/actions')

const { log } = require('../components/Log')

const machine = Machine({
  id: 'interactions',
  strict: true,
  initial: 'idle',
  context: {
    miniMode: false,
    snap: false,
    selection: null,
    draggingController: null, // TODO draggables[]
    teleportDragController: null
  },
  states: {
    idle: {
      on: {
        // TODO move to onEntry?
        // idle always clears the selection if it is present
        '': {
          cond: 'selectionPresent',
          actions: ['clearDraggingController', 'clearSelection', 'onSelectNone']
        },
        TRIGGER_START: [
          // skip immediately to the drag behavior for objects and characters
          {
            cond: 'eventHasObjectOrCharacterIntersection',
            target: 'drag_object',
            actions: ['updateDraggingController', 'updateSelection', 'onSelected']
          },
        ],
        GRIP_DOWN: {
          actions: ['updateTeleportDragController'],
          target: 'drag_teleport'
        },
        AXES_CHANGED: {
          actions: ['moveAndRotateCamera']
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
          // if we select a bone, don't try to drag it
          {
            cond: 'eventHasBoneIntersection',
            actions: ['onSelectedBone']
          },

          // anything selected that's not a bone can be dragged
          {
            actions: ['updateDraggingController', 'updateSelection', 'onSelected'],
            target: 'drag_object'
          },

          // TODO

          // {
          //   cond: 'selectionChanged',
          //   actions: ['updateDraggingController', 'updateSelection', 'onSelected'],
          //   target: 'drag_object'
          // },
          // {
          //   cond: 'controllerSameAndselectionSame',
          //   target: 'drag_object'
          // }
        ],

        GRIP_DOWN: {
          actions: ['updateTeleportDragController'],
          target: 'drag_teleport'
        },

        AXES_CHANGED: {
          actions: (context, event) => { log('TODO moveAndRotateObject') }
        }
      }
    },
    drag_object: {
      on: {
        // TRIGGER_START: {
          // if you are dragging an object,
          // but then start dragging something with a different controller,
                // cond: 'eventHasObjectOrCharacterIntersection',
          // actions: ['onDragObjectEnd', 'updateDraggingController', 'updateSelection', 'onSelected'],
          // target: 'drag_object'
        // },

        TRIGGER_END: {
          cond: 'controllerSame',
          actions: ['onDragObjectEnd'],
          target: 'selected'
        }

        // can't teleport while selected
        // TODO allow this using parallel machines?
      }
    },
    drag_teleport: {
      // TODO what causes an error here?
      onEntry: 'onDragTeleportStart',
      on: {
        // if you press the trigger on the teleporting controller
        TRIGGER_START: {
          cond: 'eventControllerMatchesTeleportDragController',
          actions: ['onTeleport']
        },
        GRIP_UP: [
          {
            cond: 'eventControllerNotTeleportDragController',
            actions: (context, event) => { log('! ignoring GRIP_UP during drag_teleport') }
          },
          {
            // if there is a selection, go back to the selected state
            cond: 'selectionPresent',
            actions: ['onDragTeleportEnd', 'clearTeleportDragController'],
            target: 'selected'
          }, {
            // otherwise, go to the idle state
            actions: ['onDragTeleportEnd', 'clearTeleportDragController'],
            target: 'idle'
          }
        ]
      }
    },
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

    updateDraggingController: assign({
      draggingController: (context, event) => event.controller.gamepad.index
    }),
    clearDraggingController: assign({
      draggingController: (context, event) => null
    }),

    updateTeleportDragController: assign({
      teleportDragController: (context, event) => event.controller.gamepad.index
    }),
    clearTeleportDragController: assign({
      teleportDragController: (context, event) => null
    }),
  },
  guards: {
    // TODO simplify these
    selectionPresent: (context, event) => context.selection != null,
    selectionChanged: (context, event) => event.intersection.id !== context.selection,
    selectionSame: (context, event) => event.intersection.id === context.selection,
    selectionNil: (context, event) => event.intersection == null,

    eventHasIntersection: (context, event) => event.intersection != null,
    eventHasObjectOrCharacterIntersection: (context, event) => event.intersection != null && ['object', 'character'].includes(event.intersection.type),
    eventHasBoneIntersection: (context, event) => event.intersection != null && event.intersection.type == 'bone',

    eventControllerMatchesTeleportDragController: (context, event) => event.controller.gamepad.index === context.teleportDragController,
    eventControllerNotTeleportDragController: (context, event) => event.controller.gamepad.index !== context.teleportDragController,

    // TODO review these!!!
    controllerSame: (context, event) => event.controller.gamepad.index === context.draggingController,
    controllerChanged: (context, event) => event.controller.gamepad.index !== context.draggingController,

    // controllerSameAndselectionSame: (context, event) =>
    //   (event.controller.gamepad.index === context.draggingController) &&
    //   (event.intersection.id === context.selection)
  }
})

module.exports = machine
