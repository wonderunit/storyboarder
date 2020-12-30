const { Machine, assign } = require('xstate')

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
            cond: 'eventHasSceneObjectIntersection',
            target: 'drag_object',
            actions: ['updateDraggingController', 'updateSelection', 'onSelected']
          },
        ],
        GRIP_DOWN: [
          {
            cond: 'eventHasSceneObjectIntersection',
            target: 'selected',
            actions: ['updateSelection', 'onSelected']
          },
          {
            actions: ['updateTeleportDragController'],
            target: 'drag_teleport'
          }
        ],
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
          // if we select a bone, don't do anything
          {
            cond: 'eventHasBoneIntersection'
          },
          {
            cond: 'eventHasControlPointIntersection',
            actions: ['updateDraggingController'],
            target: 'drag_control_point'
          },
          // anything selected that's not a bone can be dragged
          {
            actions: ['updateDraggingController', 'updateSelection', 'onSelected'],
            target: 'drag_object'
          },
        ],

        GRIP_DOWN: [
          {
            cond: 'eventHasBoneIntersection',
            target: 'rotate_bone'
          },
          {
            cond: 'eventHasSceneObjectIntersection',
            target: 'selected',
            actions: ['updateSelection', 'onSelected']
          },
          {
            actions: [
              'clearDraggingController', 'clearSelection', 'onSelectNone',
              'updateTeleportDragController'
            ],
            target: 'drag_teleport'
          }
        ],

        AXES_CHANGED: {
          actions: ['moveAndRotateCamera']
        },
        PRESS_END_X: {
          actions: 'onDropLowest'
        },
        POSE_CHARACTER: {
          cond: 'eventHasCharacterIntersection',
          target: 'character_posing'
        },

        CLEAR_SELECTION: {
          actions: 'onSelectionClear',
          target: 'idle'
        }
      }
    },
    drag_control_point :
    {
      onEntry: 'onDragControlPointEntry',
      onExit: 'onDragControlPointExit',
      on: {
        TRIGGER_END: {
          cond: 'controllerSame',
          target: 'selected'
        },
        AXES_CHANGED: {
          actions: ['moveAndRotateControlPoint']
        },

      },
    },
    character_posing :
    {
      onEntry: 'onPosingCharacterEntry',
      onExit: 'onPosingCharacterExit',
      on : {
        STOP_POSING: {
          target: 'selected'
        }
      }
    }, 
    drag_object: {
      onEntry: 'onDragObjectEntry',
      onExit: ['onSnapEnd', 'onDragObjectExit'],
      on: {
        TRIGGER_END: {
          cond: 'controllerSame',
          target: 'selected'
        },

        AXES_CHANGED: {
          actions: ['moveAndRotateObject']
        },

        GRIP_DOWN: {
          cond: 'sameControllerOnSnappableObject',
          actions: 'onSnapStart'
        },
        GRIP_UP: {
          cond: 'sameControllerOnSnappableObject',
          actions: 'onSnapEnd',
          target: 'selected'
        },
        PRESS_END_X: {
          actions: 'onDropLowest'
        },

        CLEAR_SELECTION: {
          actions: ['onDragObjectExit', 'onSnapEnd', 'onSelectionClear'],
          target: 'selected'
        }
      }
    },
    drag_teleport: {
      onEntry: 'onDragTeleportStart',
      on: {
        // if you press the trigger on the teleporting controller
        TRIGGER_START: {
          cond: 'eventControllerMatchesTeleportDragController',
          actions: ['onTeleport']
        },
        GRIP_DOWN: {
          cond: 'bothGripsDown',
          actions: 'onToggleMiniMode'
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
        ],
        AXES_CHANGED: {
          actions: ['moveAndRotateCamera']
        }
      },
    },
    rotate_bone: {
      onEntry: ['updateDraggingController', 'onRotateBoneEntry'],
      onExit: ['onRotateBoneExit', 'clearDraggingController'],
      on: {
        GRIP_UP: {
          cond: 'controllerSame',
          target: 'selected'
        }
      }
    }
  }
}, {
  actions: {
    // TODO simplify these
    updateSelection: assign({
      selection: (context, event) => event.intersection.id,
      selectionType: (context, event) => event.intersection.object.userData.type,
    }),
    clearSelection: assign({
      selection: (context, event) => null,
      selectionType: (context, event) => null
    }),

    updateDraggingController: assign({
      draggingController: (context, event) => event.controller.userData.inputSourceIndex
    }),
    clearDraggingController: assign({
      draggingController: (context, event) => null
    }),

    updateTeleportDragController: assign({
      teleportDragController: (context, event) => event.controller.userData.inputSourceIndex
    }),
    clearTeleportDragController: assign({
      teleportDragController: (context, event) => null
    }),
  },
  guards: {
    selectionPresent: (context, event) => context.selection != null,
    selectionNil: (context, event) => event.intersection == null,
    //setRediractedModeSelect : (context, event) => 

    eventHasSceneObjectIntersection: (context, event) => event.intersection != null && ['object', 'character', 'light', 'virtual-camera', 'image', 'attachable'].includes(event.intersection.type),
    eventHasBoneIntersection: (context, event) => event.intersection != null && event.intersection.bone,
    eventHasCharacterIntersection : (context, event) => context.selectionType === 'character',
    eventHasControlPointIntersection: (context, event) => event.intersection != null && event.intersection.controlPoint,

    eventControllerMatchesTeleportDragController: (context, event) => event.controller.userData.inputSourceIndex === context.teleportDragController,
    eventControllerNotTeleportDragController: (context, event) => event.controller.userData.inputSourceIndex !== context.teleportDragController,

    bothGripsDown: (context, event) => event.controller.userData.inputSourceIndex !== context.teleportDragController,

    controllerSame: (context, event) => event.controller.userData.inputSourceIndex === context.draggingController,

    sameControllerOnSnappableObject: (context, event) =>
      // the controller matches the one we're dragging with
      (event.controller.userData.inputSourceIndex === context.draggingController) &&
      // and the selected object is anything but a character
      (context.selectionType && context.selectionType != 'character')
  }
})

module.exports = machine
