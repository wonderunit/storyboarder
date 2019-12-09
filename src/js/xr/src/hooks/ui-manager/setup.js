const { selectObject } = require('../../../../shared/reducers/shot-generator')

const setupHomePane = (paneComponents, self) => {
  // 4 image buttons
  paneComponents['home'] = {
    'select-button': {
      id: 'select-button',
      type: 'image-button',
      x: 667 + 10 + 10,
      y: 684 + 10 + 10,
      width: 64,
      height: 64,
      image: 'selection',
      onSelect: () => {
        self.dispatch(selectObject(null))
        self.send('GO_HOME')
      }
    },
    'add-button': {
      id: 'add-button',
      type: 'image-button',
      x: 667 + 10 + 10,
      y: 684 + 105 + 10,
      width: 64,
      height: 64,
      image: 'add',
      onSelect: () => {
        self.send('GO_ADD')
      }
    },
    'duplicate-button': {
      id: 'duplicate-button',
      type: 'image-button',
      x: 667 + 105 + 10,
      y: 684 + 10 + 10,
      width: 64,
      height: 64,
      image: 'duplicate',
      onSelect: () => {
        self.send('REQUEST_DUPLICATE', { selections: self.state.selections })
      }
    },
    'delete-button': {
      id: 'delete-button',
      type: 'image-button',
      x: 667 + 105 + 10,
      y: 684 + 105 + 10,
      width: 64,
      height: 64,
      image: 'erase',
      onSelect: () => {
        self.send('REQUEST_DELETE', { selections: self.state.selections })
      }
    },
    'hud-button': {
      id: 'hud-button',
      type: 'image-button',
      x: 909 + 12,
      y: 684 + 12,
      width: 64,
      height: 64,
      image: 'hud',

      onSelect: () => {
        self.send('TOGGLE_HUD')
      }
    },
    'quote-1': {
      id: 'quote-1',
      type: 'text',
      x: 453 + 20,
      y: 889 + 20,
      label: `“You never change things by fighting the existing reality.`,
      size: 16
    },
    'quote-2': {
      id: 'quote-2',
      type: 'text',
      x: 453 + 20,
      y: 889 + 20 + 27,
      label: `To change something, build a new model`,
      size: 16
    },
    'quote-3': {
      id: 'quote-3',
      type: 'text',
      x: 453 + 20,
      y: 889 + 20 + 27 * 2,
      label: `that makes the existing model obsolete.”`,
      size: 16
    },
    'quote-4': {
      id: 'quote-4',
      type: 'text',
      x: 453 + 20,
      y: 889 + 20 + 27 * 3,
      label: `― Richard Buckminster Fuller`,
      size: 16
    }
  }
}

const setupAddPane = (paneComponents, self) => {
  // 4 image buttons
  paneComponents['add'] = {
    'add-camera': {
      id: 'add-camera',
      type: 'image-button',
      x: 456 + 10 + 10,
      y: 684 + 10 + 10,
      width: 64,
      height: 64,
      image: 'icon-toolbar-camera',

      onSelect: () => {
        self.send('ADD_OBJECT', { object: 'camera' })
      }
    },

    'add-object': {
      id: 'add-object',
      type: 'image-button',
      x: 456 + 105 + 10,
      y: 684 + 10 + 10,
      width: 64,
      height: 64,
      image: 'icon-toolbar-object',

      onSelect: () => {
        self.send('ADD_OBJECT', { object: 'object' })
      }
    },

    'add-character': {
      id: 'add-character',
      type: 'image-button',
      x: 456 + 10 + 10,
      y: 684 + 105 + 10,
      width: 64,
      height: 64,
      image: 'icon-toolbar-character',

      onSelect: () => {
        self.send('ADD_OBJECT', { object: 'character' })
        // undoGroupStart()
        // console.log(deleteObjects([sceneObject.id]))
        // this.dispatch(deleteObjects([sceneObject.id]))
        // this.dispatch(selectObject(null))
        // selectObject(id)
        // undoGroupEnd()
      }
    },

    'add-light': {
      id: 'add-light',
      type: 'image-button',
      x: 456 + 105 + 10,
      y: 684 + 105 + 10,
      width: 64,
      height: 64,
      image: 'icon-toolbar-light',

      onSelect: () => {
        self.send('ADD_OBJECT', { object: 'light' })
      }
    }
  }
}

const setupHelpPane = (paneComponents, self) => {
  paneComponents['help'] = {
    'prev-help': {
      id: 'prev-help',
      type: 'image-button',
      x: 6,
      y: 6,
      width: 48,
      height: 48,
      image: 'arrow',
      flip: true,
      drawBG: true,
      padding: 6,

      onSelect: () => {
        self.send('INCREMENT_HELP', { direction: 'decrement' })
      }
    },

    'next-help': {
      id: 'next-help',
      type: 'image-button',
      x: 6 + 48 + 28 + 6,
      y: 6,
      width: 48,
      height: 48,
      image: 'arrow',
      drawBG: true,
      padding: 6,

      onSelect: () => {
        self.send('INCREMENT_HELP', { direction: 'increment' })
      }
    },

    'close-help': {
      id: 'close-help',
      type: 'image-button',
      x: 1024 - 48 - 6,
      y: 6,
      width: 48,
      height: 48,
      image: 'close',
      drawBG: true,
      padding: 6,

      onSelect: () => {
        self.send('TOGGLE_HELP')
      }
    }
  }
}

const setupBoardsPane = (paneComponents, self) => {
  paneComponents['boards'] = {
    'scene-cameras-title': {
      type: 'text',
      x: 15,
      y: 15,
      label: `Scene Cameras`,
      size: 18,
      weight: 'bold'
    },

    'boards-title': {
      type: 'text',
      x: 15,
      y: 15 + 370 * 0.6,
      label: `Boards`,
      size: 18,
      weight: 'bold'
    },

    'save-board-button': {
      id: 'save-board-button',
      type: 'button',
      x: 0,
      y: 415,
      width: 118 + 18 * 2,
      height: 18 * 3,
      fill: 'black',
      label: 'Save to board',
      fontSize: 18,
      fontWeight: 'bold',

      onSelect: () => {
        self.send('SAVE_BOARD')
      }
    },

    'insert-board-button': {
      id: 'insert-board-button',
      type: 'button',
      x: 118 + 18 * 2 + 15,
      y: 415,
      width: 168 + 18 * 2,
      height: 18 * 3,
      fill: 'black',
      label: 'Insert as new board',
      fontSize: 18,
      fontWeight: 'bold',

      onSelect: () => {
        self.send('INSERT_BOARD')
      }
    },

    'help-button': {
      id: 'help-button',
      type: 'image-button',
      x: 1024 - (18 * 3 - 6) * 3 - 12 - 30,
      y: 420,
      width: 18 * 3 - 12,
      height: 18 * 3 - 12,
      image: 'help',
      drawBG: true,
      padding: 6,
      rounding: 12,

      onSelect: () => {
        self.send('TOGGLE_HELP')
        self.send('GO_HOME')
      }
    },

    'settings-button': {
      id: 'settings-button',
      type: 'image-button',
      x: 1024 - (18 * 3 - 6) * 2 - 6 - 15,
      y: 420,
      width: 18 * 3 - 12,
      height: 18 * 3 - 12,
      image: 'settings',
      drawBG: true,
      padding: 6,
      rounding: 12,

      onSelect: () => {
        self.send('TOGGLE_SETTINGS')
      }
    },

    'hud-close-button': {
      id: 'hud-close-button',
      type: 'image-button',
      x: 1024 - (18 * 3 - 6),
      y: 420,
      width: 18 * 3 - 12,
      height: 18 * 3 - 12,
      image: 'close',
      drawBG: true,
      padding: 6,
      rounding: 12,

      onSelect: () => {
        self.send('TOGGLE_HUD')
      }
    }
  }
}

module.exports = {
  setupHomePane,
  setupAddPane,
  setupHelpPane,
  setupBoardsPane
}
