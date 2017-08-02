const {Menu} = require('electron').remote
const {ipcRenderer} = require('electron')

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('save')
        }
      },
      {
        label: 'Open...',
        accelerator: 'CmdOrCtrl+O',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('openDialogue')
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Export Animated GIF',
        accelerator: 'CmdOrCtrl+E',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('exportAnimatedGif')
        }
      },
      {
        label: 'Export Scene for Final Cut Pro X and Premiere',
        click (item, focusedWindow, event) {
          ipcRenderer.send('exportFcp')
        }
      },
      {
        label: 'Export Scene as Images',
        click (item, focusedWindow, event) {
          ipcRenderer.send('exportImages')
        }
      },
      {
        label: 'Export a PDF',
        click (item, focusedWindow, event) {
          ipcRenderer.send('exportPDF')
        }
      },
      {
        label: 'Clean Up Scene …',
        click (item, focusedWindow, event) {
          ipcRenderer.send('exportCleanup')
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: 'CmdOrCtrl+P',
        label: 'Print a Storyboarder worksheet...',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('printWorksheet')
        }
      },
      {
        accelerator: 'CmdOrCtrl+I',
        label: 'Import worksheets...',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('importWorksheets')
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Import Images...',
        accelerator: 'CmdOrCtrl+Shift+i',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('importImagesDialogue')
        }
      },
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        role: 'undo'
      },
      {
        label: 'Redo',
        accelerator: 'Shift+CmdOrCtrl+Z',
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        role: 'cut'
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy'
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        role: 'paste'
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        role: 'selectall'
      },
      {
        type: 'separator'
      }
    ]
  },
  {
    label: 'Navigation',
    submenu: [
      {
        label: 'Play',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('togglePlayback')
        }
      },
      {
        type: 'separator'
      },
      {
        // accelerator: 'Left',
        label: 'Previous Board',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('goPreviousBoard')
        }
      },
      {
        // accelerator: 'Right',
        label: 'Next Board',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('goNextBoard')
        }
      },
      {
        accelerator: 'CmdOrCtrl+Left',
        label: 'Previous Scene',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('previousScene')
        }
      },
      {
        accelerator: 'CmdOrCtrl+Right',
        label: 'Next Scene',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('nextScene')
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Toggle speaking',
        type: 'checkbox',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('toggleSpeaking')
        }
      }
    ]
  },
  {
    label: 'Boards',
    submenu: [
      {
        accelerator: 'N',
        label: 'New Board',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('newBoard', 1)
        }
      },
      {
        accelerator: 'Shift+N',
        label: 'New Board Before',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('newBoard', -1)
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: 'CmdOrCtrl+Backspace',
        label: 'Delete Board(s)',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('deleteBoards')
        }
      },
      {
        accelerator: 'CmdOrCtrl+Delete',
        label: 'Delete Board(s) - Go Forward',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('deleteBoards', 1)
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: 'D',
        label: 'Duplicate Board',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('duplicateBoard')
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: 'Alt+Left',
        label: 'Reorder Left',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('reorderBoardsLeft')
        }
      },
      {
        accelerator: 'Alt+Right',
        label: 'Reorder Right',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('reorderBoardsRight')
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: '/',
        label: 'Toggle Board as New Shot',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('toggleNewShot')
        }
      },
    ]
  },
  {
    label: 'Tools',
    submenu: [
      {
        accelerator: '1',
        label: 'Light Pencil',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('setTool', 'lightPencil')
        }
      },
      {
        accelerator: '2',
        label: 'Pencil',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('setTool', 'pencil')
        }
      },
      {
        accelerator: '3',
        label: 'Pen',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('setTool', 'pen')
        }
      },
      {
        accelerator: '4',
        label: 'Brush',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('setTool', 'brush')
        }
      },
      {
        accelerator: '5',
        label: 'Note Pen',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('setTool', 'notePen')
        }
      },
      {
        accelerator: '6',
        label: 'Eraser',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('setTool', 'eraser')
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: 'Backspace',
        label: 'Clear All Layers',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('clear')
        }
      },
      {
        accelerator: 'Alt+Backspace',
        label: 'Clear Layer',
        click (item, focusedWindow, event) {
          ipcRenderer.send('clear', true)
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: '[',
        label: 'Smaller Brush',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('brushSize', -1)
        }
      },
      {
        accelerator: ']',
        label: 'Larger Brush',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('brushSize', 1)
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: '8',
        label: 'Use Palette Color 1',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('useColor', 1)
        }
      },
      {
        accelerator: '9',
        label: 'Use Palette Color 2',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('useColor', 2)
        }
      },
      {
        accelerator: '0',
        label: 'Use Palette Color 3',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('useColor', 3)
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: 'CmdOrCtrl+F',
        label: 'Flip Horizontal',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('flipBoard')
        }
      },
      {
        label: 'Flip Vertical',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('flipBoard', true)
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Edit in Photoshop',
        accelerator: 'CmdOrCtrl+.',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('openInEditor')
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Cycle View Mode',
        accelerator: 'Tab',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('cycleViewMode')
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Toggle Grid Guide',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('toggleGuide', 'grid')
        }
      },
      {
        label: 'Toggle Center Guide',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('toggleGuide', 'center')
        }
      },
      {
        label: 'Toggle Thirds Guide',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('toggleGuide', 'thirds')
        }
      },
      {
        label: 'Toggle Diagonal Guide',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('toggleGuide', 'diagonals')
        }
      },
      {
        label: 'Toggle Onion Skin',
        accelerator: 'o',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('toggleGuide', 'onion')
        }
      },
      {
        label: 'Toggle Captions',
        accelerator: 'c',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('toggleCaptions')
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.reload()
        }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.webContents.toggleDevTools()
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: 'F11',
        role: 'togglefullscreen'
      }
    ]
  },
  {
    role: 'window',
    submenu: [
      {
        role: 'minimize'
      },
      {
        role: 'close'
      }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click () { require('electron').shell.openExternal('https://wonderunit.com/storyboarder/') }
      },
      {
        label: 'Found a bug? Submit an issue!!!',
        click () { require('electron').shell.openExternal('https://github.com/wonderunit/storyboarder/issues/new') }
      },
      {
        type: 'separator'
      },
      {
        label: 'Key Commands...',
        accelerator: 'CmdOrCtrl+K',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('showKeyCommands')
        }
      },
      {
        label: 'Show me a story tip!',
        accelerator: 'CmdOrCtrl+T',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('showTip')
        }
      }
    ]
  }
]

const addDarwinFeatures = (template, includePreferences = false) => {
  const name = require('electron').remote.app.getName()

  let submenu = [
    {
      role: 'about'
    }
  ]

  if (includePreferences) {
    submenu.push(
      {
        type: 'separator'
      }
    )
    submenu.push(
      {
        label: 'Preferences',
        accelerator: 'Cmd+,',
        click: () => ipcRenderer.send('preferences')
      }
    )
  }

  submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Services',
      role: 'services',
      submenu: []
    },
    {
      type: 'separator'
    },
    {
      role: 'hide'
    },
    {
      role: 'hideothers'
    },
    {
      role: 'unhide'
    },
    {
      type: 'separator'
    },
    {
      role: 'quit'
    }
  )

  template.unshift({
    label: name,
    submenu
  })
}
if (process.platform === 'darwin') {
  addDarwinFeatures(template, true)
  // // Edit menu.
  // template[1].submenu.push(
  //   {
  //     type: 'separator'
  //   },
  //   {
  //     label: 'Speech',
  //     submenu: [
  //       {
  //         role: 'startspeaking'
  //       },
  //       {
  //         role: 'stopspeaking'
  //       }
  //     ]
  //   }
  // )
  // Window menu.
  template[7].submenu = [
    {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    },
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    },
    {
      label: 'Zoom',
      role: 'zoom'
    },
    {
      type: 'separator'
    },
    {
      label: 'Bring All to Front',
      role: 'front'
    }
  ]
}


const welcomeTemplate = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Open...',
        accelerator: 'CmdOrCtrl+O',
        click ( item, focusedWindow, event) {
          ipcRenderer.send('openDialogue')
        }
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        role: 'copy'
      },
      {
        role: 'paste'
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.reload()
        }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.webContents.toggleDevTools()
        }
      },
      {
        type: 'separator'
      },
      {
        accelerator: 'CmdOrCtrl+F',
        role: 'togglefullscreen'
      }
    ]
  },
  {
    role: 'window',
    submenu: [
      {
        role: 'minimize'
      },
      {
        role: 'close'
      }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click () { require('electron').shell.openExternal('https://wonderunit.com/software/storyboarder/') }
      },
      {
        label: 'Found a bug? Submit an issue!!!',
        click () { require('electron').shell.openExternal('https://github.com/wonderunit/storyboarder/issues/new') }
      }
    ]
  }
]
if (process.platform === 'darwin') {
  addDarwinFeatures(welcomeTemplate, false)
}

// add Edit > Preferences on Windows
if (process.platform == 'win32') {
  template[1].submenu.push(
    {
      type: 'separator'
    }
  )
  template[1].submenu.push(
    {
      label: 'Preferences',
      accelerator: 'CmdOrCtrl+,',
      click: () => ipcRenderer.send('preferences')
    }
  )
}

const menuInstance = Menu.buildFromTemplate(template)
const welcomeMenuInstance = Menu.buildFromTemplate(welcomeTemplate)

const menu = {
  setWelcomeMenu: function() {
    Menu.setApplicationMenu(welcomeMenuInstance)
  },
  setMenu: function() {
    Menu.setApplicationMenu(menuInstance)
  }
}

module.exports = menu