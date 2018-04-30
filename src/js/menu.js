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
    accelerator: keystrokeFor('menu:view:toggle-developer-tools'),
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
SubMenuFragments.windowing = [
  {
    label: 'Minimize',
    accelerator: keystrokeFor("menu:window:minimize"),
    role: 'minimize'
  },
  {
    label: 'Close Window',
    accelerator: keystrokeFor("menu:window:close"),
    role: 'close'
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
      label: 'Export Video',
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportVideo')
      }
    },
    {
      label: 'Export to Web …',
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportWeb')
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
      accelerator: keystrokeFor('menu:file:print'),
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
      accelerator: keystrokeFor("menu:file:import-images"),
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
      accelerator: keystrokeFor('menu:edit:undo'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('undo')
      }
    },
    {
      label: 'Redo',
      accelerator: keystrokeFor('menu:edit:redo'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('redo')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Cut',
      accelerator: keystrokeFor('menu:edit:cut'),
      role: 'cut'
    },
    {
      label: 'Copy',
      accelerator: keystrokeFor('menu:edit:copy'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('copy')
      }
    },
    {
      label: 'Paste',
      accelerator: keystrokeFor('menu:edit:paste'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('paste')
      }
    },
    {
      label: 'Select All',
      accelerator: keystrokeFor('menu:edit:select-all'),
      role: 'selectall'
    },

    // add Edit > Preferences on Windows
    ...process.platform == 'win32'
    ? [
        {
          type: 'separator'
        },
        {
          label: 'Preferences',
          accelerator: keystrokeFor('menu:edit:preferences'),
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
      // commented out. we don't route this through the menu.
      // accelerator: keystrokeFor('menu:navigation:previous-board'),
      label: 'Previous Board',
      click (item, focusedWindow, event) {
        ipcRenderer.send('goPreviousBoard')
      }
    },
    {
      // commented out. we don't route this through the menu.
      // accelerator: keystrokeFor('menu:navigation:next-board'),
      label: 'Next Board',
      click (item, focusedWindow, event) {
        ipcRenderer.send('goNextBoard')
      }
    },
    {
      // NOTE for some reason, this accelerator does not trigger a click (CmdOrCtrl+Left)
      accelerator: keystrokeFor('menu:navigation:previous-scene'),
      label: 'Previous Scene',
      click (item, focusedWindow, event) {
        ipcRenderer.send('previousScene')
      }
    },
    {
      // NOTE for some reason, this accelerator does not trigger a click (CmdOrCtrl+Right)
      accelerator: keystrokeFor('menu:navigation:next-scene'),
      label: 'Next Scene',
      click (item, focusedWindow, event) {
        ipcRenderer.send('nextScene')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Stop All Board Audio',
      // NOTE: menu won't send this, we have to listen for it explicitly in the key handler
      accelerator: keystrokeFor('menu:navigation:stop-all-sounds'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('stopAllSounds')
      }
    },
    {
      label: 'Toggle speaking',
      type: 'checkbox',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleSpeaking')
      }
    },
    {
      label: 'Audition Board Audio',
      type: 'checkbox',
      accelerator: keystrokeFor('menu:navigation:toggle-audition'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleAudition')
      }
    }
  ]
})
AppMenu.Boards = () => ({
  label: 'Boards',
  submenu: [
    {
      accelerator: keystrokeFor('menu:boards:new-board'),
      label: 'New Board',
      click (item, focusedWindow, event) {
        ipcRenderer.send('newBoard', 1)
      }
    },
    {
      accelerator: keystrokeFor('menu:boards:new-board-before'),
      label: 'New Board Before',
      click (item, focusedWindow, event) {
        ipcRenderer.send('newBoard', -1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:boards:delete-boards'),
      label: 'Delete Board(s)',
      click (item, focusedWindow, event) {
        ipcRenderer.send('deleteBoards')
      }
    },
    {
      accelerator: keystrokeFor('menu:boards:delete-boards-go-forward'),
      label: 'Delete Board(s) - Go Forward',
      click (item, focusedWindow, event) {
        ipcRenderer.send('deleteBoards', 1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:boards:duplicate'),
      label: 'Duplicate Board',
      click (item, focusedWindow, event) {
        ipcRenderer.send('duplicateBoard')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:boards:reorder-left'),
      label: 'Reorder Left',
      click (item, focusedWindow, event) {
        ipcRenderer.send('reorderBoardsLeft')
      }
    },
    {
      accelerator: keystrokeFor('menu:boards:reorder-right'),
      label: 'Reorder Right',
      click (item, focusedWindow, event) {
        ipcRenderer.send('reorderBoardsRight')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:boards:add-audio-file"),
      label: 'Add Audio File…',
      click (item, focusedWindow, event) {
        ipcRenderer.send('addAudioFile')
      }
    },
    {
      accelerator: keystrokeFor("menu:boards:toggle-new-shot"),
      label: 'Toggle Board as New Shot',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleNewShot')
      }
    }
  ]
})
AppMenu.Tools = () => ({
  label: 'Tools',
  submenu: [
    {
      accelerator: keystrokeFor('menu:tools:light-pencil'),
      label: 'Light Pencil',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'light-pencil')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:brush'),
      label: 'Brush',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'brush')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:tone'),
      label: 'Tone',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'tone')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:pencil'),
      label: 'Pencil',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'pencil')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:pen'),
      label: 'Pen',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'pen')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:note-pen'),
      label: 'Note Pen',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'note-pen')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:eraser'),
      label: 'Eraser',
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'eraser')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:tools:clear-all-layers"),
      label: 'Clear All Layers',
      click (item, focusedWindow, event) {
        ipcRenderer.send('clear')
      }
    },
    {
      accelerator: keystrokeFor("menu:tools:clear-layer"),
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
      accelerator: keystrokeFor("menu:tools:palette-color-1"),
      label: 'Use Palette Color 1',
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 1)
      }
    },
    {
      accelerator: keystrokeFor("menu:tools:palette-color-2"),
      label: 'Use Palette Color 2',
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 2)
      }
    },
    {
      accelerator: keystrokeFor("menu:tools:palette-color-3"),
      label: 'Use Palette Color 3',
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 3)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:tools:flip-horizontal"),
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
      label: 'Shot Generator',
      click (item, focusedWindow, event) {
        ipcRenderer.send('revealShotGenerator')
      }
    },
    {
      label: 'Edit in Photoshop',
      accelerator: keystrokeFor('menu:tools:edit-in-photoshop'),
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
      accelerator: keystrokeFor('menu:view:cycle-view-mode'),
      click (item, focusedWindow, event) {
        // NOTE this is only triggered by menu directly, not by key
        ipcRenderer.send('cycleViewMode', +1)
      }
    },
    {
      label: 'Reverse Cycle View Mode',
      accelerator: keystrokeFor('menu:view:cycle-view-mode-reverse'),
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
      accelerator: keystrokeFor('menu:view:onion-skin'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'onion')
      }
    },
    {
      label: 'Toggle Captions',
      accelerator: keystrokeFor('menu:view:toggle-captions'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleCaptions')
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Toggle Boards/Timeline Mode',
      accelerator: keystrokeFor('menu:view:toggle-timeline'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleTimeline')
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
      accelerator: keystrokeFor("menu:view:toggle-full-screen"),
      role: 'togglefullscreen'
    }
  ]
})
AppMenu.window = () => {
  let extension = process.platform == 'darwin'
    ? [
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
      ...SubMenuFragments.windowing,
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
      accelerator: keystrokeFor('menu:help:show-key-commands'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('showKeyCommands')
      }
    },
    {
      label: 'Show me a story tip!',
      accelerator: keystrokeFor('menu:help:show-story-tip'),
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
          accelerator: keystrokeFor('menu:about:preferences'),
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
        accelerator: keystrokeFor('menu:file:open'),
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
      ...SubMenuFragments.windowing
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

const setEnableAudition = value =>
  Menu
    .getApplicationMenu().items.find(n => n.label === 'Navigation')
    .submenu.items.find(n => n.label === 'Audition Board Audio')
    .checked = value

module.exports = {
  setWelcomeMenu,
  setMenu,

  setEnableAudition
}
