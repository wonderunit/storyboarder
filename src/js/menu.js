const { Menu, app } = require('electron').remote
const { ipcRenderer, shell } = require('electron')
const isDev = require('electron-is-dev')
const { getInitialStateRenderer } = require('electron-redux')

const configureStore = require('./shared/store/configureStore')
const observeStore = require('./shared/helpers/observeStore')

const store = configureStore(getInitialStateRenderer(), 'renderer')

// TODO subscribe to store, update menu when keymap changes

let keystrokeFor = command => store.getState().entities.keymap[command]

let SubMenuFragments = {}
SubMenuFragments.View = [
  ...isDev
    ? [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
          }
        }
      ]
    : [],
  {
    label: 'Toggle Developer Tools',
    accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
    click (item, focusedWindow) {
      if (focusedWindow) focusedWindow.webContents.toggleDevTools()
    }
  }
]
SubMenuFragments.help = [
  {
    label: 'Learn More',
    click () { shell.openExternal('https://wonderunit.com/storyboarder') }
  },
  {
    label: 'Found a bug? Submit an issue!!!',
    click () { shell.openExternal('https://github.com/wonderunit/storyboarder/issues/new') }
  }
]

let AppMenu = {}
AppMenu.File = () => ({
  label: 'File',
  submenu: [
    {
      label: 'Open…',
      accelerator: keystrokeFor('menu:file:open'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('openDialogue')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Save',
      accelerator: keystrokeFor('menu:file:save'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('save')
      }
    },
    {
      label: 'Save As …',
      accelerator: keystrokeFor('menu:file:save-as'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('saveAs')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Export Animated GIF',
      accelerator: keystrokeFor('menu:file:export-animated-gif'),
      click (item, focusedWindow, event) {
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
      label: 'Export Project as ZIP',
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportZIP')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Clean Up Scene…',
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportCleanup')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: 'CmdOrCtrl+P',
      label: 'Print or export to PDF…',
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportPDF')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:file:print-worksheet"),
      label: 'Print a Storyboarder worksheet…',
      click (item, focusedWindow, event) {
        ipcRenderer.send('printWorksheet')
      }
    },
    {
      accelerator: keystrokeFor("menu:file:import-worksheets"),
      label: 'Import worksheets…',
      click (item, focusedWindow, event) {
        ipcRenderer.send('importWorksheets')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Import Images…',
      accelerator: 'CmdOrCtrl+Shift+i',
      click (item, focusedWindow, event) {
        ipcRenderer.send('importImagesDialogue')
      }
    },
  ]
})
AppMenu.Edit = () => ({
  label: 'Edit',
  submenu: [
    {
      label: 'Undo',
      accelerator: 'CmdOrCtrl+Z',
      click (item, focusedWindow, event) {
        ipcRenderer.send('undo')
      }
    },
    {
      label: 'Redo',
      accelerator: 'Shift+CmdOrCtrl+Z',
      click (item, focusedWindow, event) {
        ipcRenderer.send('redo')
      }
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
      click (item, focusedWindow, event) {
        ipcRenderer.send('copy')
      }
    },
    {
      label: 'Paste',
      accelerator: 'CmdOrCtrl+V',
      click (item, focusedWindow, event) {
        ipcRenderer.send('paste')
      }
    },
    /*
    {
      label: 'Select All',
      accelerator: 'CmdOrCtrl+A',
      role: 'selectall'
    },
    */

    // add Edit > Preferences on Windows
    ...process.platform == 'win32'
    ? [
        {
          type: 'separator'
        },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => ipcRenderer.send('preferences')
        }
      ]
    : []

    // {
    //   type: 'separator'
    // },
    // {
    //   label: 'Speech',
    //   submenu: [
    //     {
    //       role: 'startspeaking'
    //     },
    //     {
    //       role: 'stopspeaking'
    //     }
    //   ]
    // }
  ]
})
AppMenu.Navigation = () => ({
  label: 'Navigation',
  submenu: [
    {
      label: 'Play',
      click (item, focusedWindow, event) {
        ipcRenderer.send('togglePlayback')
      }
    },
    {
      type: 'separator'
    },
    {
      // accelerator: 'Left',
      label: 'Previous Board',
      click (item, focusedWindow, event) {
        ipcRenderer.send('goPreviousBoard')
      }
    },
    {
      // accelerator: 'Right',
      label: 'Next Board',
      click (item, focusedWindow, event) {
        ipcRenderer.send('goNextBoard')
      }
    },
    {
      accelerator: 'CmdOrCtrl+Left',
      label: 'Previous Scene',
      click (item, focusedWindow, event) {
        ipcRenderer.send('previousScene')
      }
    },
    {
      accelerator: 'CmdOrCtrl+Right',
      label: 'Next Scene',
      click (item, focusedWindow, event) {
        ipcRenderer.send('nextScene')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Toggle speaking',
      type: 'checkbox',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleSpeaking')
      }
    }
  ]
})
AppMenu.Boards = () => ({
  label: 'Boards',
  submenu: [
    {
      accelerator: 'N',
      label: 'New Board',
      click (item, focusedWindow, event) {
        ipcRenderer.send('newBoard', 1)
      }
    },
    {
      accelerator: 'Shift+N',
      label: 'New Board Before',
      click (item, focusedWindow, event) {
        ipcRenderer.send('newBoard', -1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: 'CmdOrCtrl+Backspace',
      label: 'Delete Board(s)',
      click (item, focusedWindow, event) {
        ipcRenderer.send('deleteBoards')
      }
    },
    {
      accelerator: 'CmdOrCtrl+Delete',
      label: 'Delete Board(s) - Go Forward',
      click (item, focusedWindow, event) {
        ipcRenderer.send('deleteBoards', 1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: 'D',
      label: 'Duplicate Board',
      click (item, focusedWindow, event) {
        ipcRenderer.send('duplicateBoard')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: 'Alt+Left',
      label: 'Reorder Left',
      click (item, focusedWindow, event) {
        ipcRenderer.send('reorderBoardsLeft')
      }
    },
    {
      accelerator: 'Alt+Right',
      label: 'Reorder Right',
      click (item, focusedWindow, event) {
        ipcRenderer.send('reorderBoardsRight')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: '/',
      label: 'Toggle Board as New Shot',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleNewShot')
      }
    },
  ]
})
AppMenu.Tools = () => ({
  label: 'Tools',
  submenu: [
    {
      accelerator: '1',
      label: 'Light Pencil',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'lightPencil')
      }
    },
    {
      accelerator: '2',
      label: 'Pencil',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'pencil')
      }
    },
    {
      accelerator: '3',
      label: 'Pen',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'pen')
      }
    },
    {
      accelerator: '4',
      label: 'Brush',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'brush')
      }
    },
    {
      accelerator: '5',
      label: 'Note Pen',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'notePen')
      }
    },
    {
      accelerator: '6',
      label: 'Eraser',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'eraser')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: 'Backspace',
      label: 'Clear All Layers',
      click (item, focusedWindow, event) {
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
      accelerator: keystrokeFor('drawing:brush-size:dec'),
      label: 'Smaller Brush',
      click (item, focusedWindow, event) {
        ipcRenderer.send('brushSize', -1)
      }
    },
    {
      accelerator: keystrokeFor('drawing:brush-size:inc'),
      label: 'Larger Brush',
      click (item, focusedWindow, event) {
        ipcRenderer.send('brushSize', 1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: '8',
      label: 'Use Palette Color 1',
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 1)
      }
    },
    {
      accelerator: '9',
      label: 'Use Palette Color 2',
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 2)
      }
    },
    {
      accelerator: '0',
      label: 'Use Palette Color 3',
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 3)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: 'CmdOrCtrl+F',
      label: 'Flip Horizontal',
      click (item, focusedWindow, event) {
        ipcRenderer.send('flipBoard')
      }
    },
    {
      label: 'Flip Vertical',
      click (item, focusedWindow, event) {
        ipcRenderer.send('flipBoard', true)
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Edit in Photoshop',
      accelerator: 'CmdOrCtrl+.',
      click (item, focusedWindow, event) {
        ipcRenderer.send('openInEditor')
      }
    }
  ]
})
AppMenu.View = () => ({
  label: 'View',
  submenu: [
    {
      label: 'Cycle View Mode',
      accelerator: 'Tab',
      click (item, focusedWindow, event) {
        // NOTE this is only triggered by menu directly, not by key
        ipcRenderer.send('cycleViewMode', +1)
      }
    },
    {
      label: 'Reverse Cycle View Mode',
      accelerator: 'Shift+Tab',
      click (item, focusedWindow, event) {
        // NOTE this is only triggered by menu directly, not by key
        ipcRenderer.send('cycleViewMode', -1)
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Toggle Grid Guide',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'grid')
      }
    },
    {
      label: 'Toggle Center Guide',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'center')
      }
    },
    {
      label: 'Toggle Thirds Guide',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'thirds')
      }
    },
    {
      label: 'Toggle 3D Guide',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'perspective')
      }
    },
    {
      label: 'Toggle Onion Skin',
      accelerator: 'o',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'onion')
      }
    },
    {
      label: 'Toggle Captions',
      accelerator: 'c',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleCaptions')
      }
    },
    {
      type: 'separator'
    },
    ...SubMenuFragments.View,
    {
      type: 'separator'
    },
    {
      accelerator: 'F11',
      role: 'togglefullscreen'
    }
  ]
})
AppMenu.window = () => {
  let extension = process.platform == 'darwin'
    ? [
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
    : []

  return {
    role: 'window',
    submenu: [
      {
        role: 'minimize'
      },
      {
        role: 'close'
      },
      ...extension
    ]
  }
}
AppMenu.help = () => ({
  role: 'help',
  submenu: [
    ...SubMenuFragments.help,
    {
      type: 'separator'
    },
    {
      label: 'Key Commands…',
      accelerator: 'CmdOrCtrl+K',
      click (item, focusedWindow, event) {
        ipcRenderer.send('showKeyCommands')
      }
    },
    {
      label: 'Show me a story tip!',
      accelerator: 'CmdOrCtrl+T',
      click (item, focusedWindow, event) {
        ipcRenderer.send('showTip')
      }
    }
  ]
})

// macOS only
AppMenu.about = (options = { includePreferences: false }) => {
  if (process.platform !== 'darwin')
    return []

  let optionalPreferences = options.includePreferences
    ? [
        {
          type: 'separator'
        },
        {
          label: 'Preferences',
          accelerator: 'Cmd+,',
          click: () => ipcRenderer.send('preferences')
        }
      ]
    : []

  return [
    {
      label: app.getName(),
      submenu: [
        {
          role: 'about',
        },
        ...optionalPreferences,
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
      ]
    }
  ]
}

const template = [
  ...AppMenu.about({ includePreferences: true }),
  AppMenu.File(),
  AppMenu.Edit(),
  AppMenu.Navigation(),
  AppMenu.Boards(),
  AppMenu.Tools(),
  AppMenu.View(),
  AppMenu.window(),
  AppMenu.help()
]

const welcomeTemplate = [
  ...AppMenu.about({ includePreferences: false }),
  {
    label: 'File',
    submenu: [
      {
        label: 'Open…',
        accelerator: 'CmdOrCtrl+O',
        click (item, focusedWindow, event) {
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
      ...SubMenuFragments.View
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
      ...SubMenuFragments.help
    ]
  }
]

const setWelcomeMenu = () => {
  let welcomeMenuInstance = Menu.buildFromTemplate(welcomeTemplate)
  Menu.setApplicationMenu(welcomeMenuInstance)
}

const setMenu = () => {
  let menuInstance = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menuInstance)
}

module.exports = {
  setWelcomeMenu,
  setMenu
}
