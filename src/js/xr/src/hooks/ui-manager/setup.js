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
    'settings-button': {
      id: 'settings-button',
      type: 'image-button',
      x: 909 + 12,
      y: 684 + 12,
      width: 64,
      height: 64,
      image: 'settings',

      onSelect: () => {
        self.send('TOGGLE_SETTINGS')
      }
    },
    'extend-button': {
      id: 'extend-button',
      type: 'image-button',
      x: 483 - 32 + 66 * 0.5,
      y: 288 - 32 + 105 * 0.5,
      width: 64,
      height: 64,
      image: 'arrow',
      flip: true,

      onSelect: () => {
        const id = self.state.selections[0]
        const sceneObject = self.state.sceneObjects[id]
        if (sceneObject.type === 'character' || sceneObject.type === 'object') self.send('TOGGLE_GRID')
      }
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

const setupSettingsPane = (paneComponents, self) => {
  paneComponents['settings'] = {
    settings: {
      id: 'settings',
      type: 'text',
      x: 0 + 30,
      y: 684 + 30,
      label: 'Settings',
      size: 36
    },

    // 'switch-hand': {
    //   id: 'switch-hand',
    //   type: 'text',
    //   x: 0 + 30,
    //   y: 684 + 20 + 48 + 30 + 40 - 12,
    //   label: 'Switch Hand',
    //   size: 24
    // },

    'show-cameras': {
      id: 'show-cameras',
      type: 'text',
      x: 0 + 30,
      y: 684 + 20 + 48 + 40 + 40 - 12,
      label: 'Show Cameras',
      size: 24
    },

    // 'switch-hand-toggle': {
    //   id: 'switch-hand-toggle',
    //   type: 'toggle-button',
    //   toggle: 'switchHand',
    //   x: 0 + 30 + 200,
    //   y: 684 + 20 + 48 + 30,
    //   width: 200,
    //   height: 80,
    //   onSelect: () => {
    //     self.send('TOGGLE_SWITCH', { toggle: 'switchHand' })
    //   }
    // },

    'show-cameras-toggle': {
      id: 'show-cameras-toggle',
      type: 'toggle-button',
      toggle: 'showCameras',
      x: 0 + 30 + 200,
      y: 684 + 20 + 48 + 40,
      width: 200,
      height: 80,
      onSelect: () => {
        self.send('TOGGLE_SWITCH', { toggle: 'showCameras' })
      }
    },

    'help-button': {
      id: 'help-button',
      type: 'image-button',
      x: 439 - 64 - 15,
      y: 684 + 20,
      width: 64,
      height: 64,
      image: 'help',
      drawBG: true,
      padding: 6,
      fill: '#6E6E6E',

      onSelect: () => {
        self.send('TOGGLE_HELP')
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

module.exports = {
  setupHomePane,
  setupAddPane,
  setupSettingsPane,
  setupHelpPane
}