const { Menu, app } = require('electron').remote
const { ipcRenderer, shell } = require('electron')
const isDev = require('electron-is-dev')
const { getInitialStateRenderer } = require('electron-redux')
const log = require('./shared/storyboarder-electron-log')

// TODO subscribe to store, update menu when keymap changes
const configureStore = require('./shared/store/configureStore')
const store = configureStore(getInitialStateRenderer(), 'renderer')
let keystrokeFor = command => store.getState().entities.keymap[command]

// TODO remove unused
// const observeStore = require('./shared/helpers/observeStore')
const i18n = require('./services/i18next.config')
let SubMenuFragments = {}
SubMenuFragments.View = (i18n) => [
  ...isDev
    ? [
        {
          label: i18n.t('menu.view.reload'),
          accelerator: 'CmdOrCtrl+R',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
          }
        }
      ]
    : [],
  {
    label: i18n.t('menu.view.toggle-dev-tools'),
    accelerator: keystrokeFor('menu:view:toggle-developer-tools'),
    click (item, focusedWindow) {
      if (focusedWindow) focusedWindow.webContents.toggleDevTools()
    }
  }
]
SubMenuFragments.help = (i18n) => [
  {
    label: i18n.t('menu.help.learn-more'),
    click () { shell.openExternal('https://wonderunit.com/storyboarder') }
  },
  {
    label: i18n.t('menu.help.getting-started'),
    click () { shell.openExternal('https://wonderunit.com/storyboarder/faq/#How-do-I-get-started') }
  },
  {
    label: i18n.t('menu.help.faq'),
    click () { shell.openExternal('https://wonderunit.com/storyboarder/faq') }
  },
  {
    type: 'separator'
  },
  {
    label: i18n.t('menu.help.bug-submit'),
    click () { shell.openExternal('https://github.com/wonderunit/storyboarder/issues/new') }
  },
  {
    label: i18n.t('menu.help.show-log-file'),
    click () {
      shell.showItemInFolder(log.transports.file.getFile().path)
    }
  }
]
SubMenuFragments.windowing = (i18n) => [
  {
    label: i18n.t('menu.window.minimize'),
    accelerator: keystrokeFor("menu:window:minimize"),
    role: 'minimize'
  },
  {
    label: i18n.t('menu.window.close-window'),
    accelerator: keystrokeFor("menu:window:close"),
    role: 'close'
  }
]

let AppMenu = {}
AppMenu.File = (i18n) => ({
  label: i18n.t('menu.file.title'),
  submenu: [
    {
      label: i18n.t('menu.file.open'),
      accelerator: keystrokeFor('menu:file:open'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('openDialogue')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.file.save'),
      accelerator: keystrokeFor('menu:file:save'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('save')
      }
    },
    {
      label: i18n.t('menu.file.save-as'),
      accelerator: keystrokeFor('menu:file:save-as'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('saveAs')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.file.export-animated-gif'),
      accelerator: keystrokeFor('menu:file:export-animated-gif'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportAnimatedGif')
      }
    },
    {
      label: i18n.t('menu.file.export-scene-final-cut-proX-and-premiere'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportFcp')
      }
    },
    {
      label: i18n.t('menu.file.export-scene-as-images'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportImages')
      }
    },
    {
      label: i18n.t('menu.file.export-video'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportVideo')
      }
    },
    {
      label: i18n.t('menu.file.export-to-web'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportWeb')
      }
    },
    {
      label: i18n.t('menu.file.export-project-as-zip'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportZIP')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.file.clean-up-scene'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportCleanup')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.file.print-pdf'),
      accelerator: keystrokeFor('menu:file:print'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportPDF')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.file.print-storyboarder-worksheet'),
      accelerator: keystrokeFor("menu:file:print-worksheet"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('printWorksheet')
      }
    },
    {
      label: i18n.t('menu.file.import-worksheets'),
      accelerator: keystrokeFor("menu:file:import-worksheets"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('importWorksheets')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.file.import-images-to-new-boards'),
      accelerator: keystrokeFor("menu:file:import-images"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('importImagesDialogue', false)
      }
    },
    {
      label: i18n.t('menu.file.import-image-and-replace'),
      accelerator: keystrokeFor("menu:file:import-image-replace"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('importImagesDialogue', true)
      }
    }
  ]
})
AppMenu.Edit = (i18n) => ({
  label: i18n.t('menu.edit.title'),
  submenu: [
    {
      label: i18n.t('menu.edit.undo'),
      accelerator: keystrokeFor('menu:edit:undo'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('undo')
      }
    },
    {
      label: i18n.t('menu.edit.redo'),
      accelerator: keystrokeFor('menu:edit:redo'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('redo')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.edit.cut'),
      accelerator: keystrokeFor('menu:edit:cut'),
      role: 'cut'
    },
    {
      label: i18n.t('menu.edit.copy'),
      accelerator: keystrokeFor('menu:edit:copy'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('copy')
      }
    },
    {
      label: i18n.t('menu.edit.paste'),
      accelerator: keystrokeFor('menu:edit:paste'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('paste')
      }
    },
    {
      label: i18n.t('menu.edit.paste-and-replace'),
      accelerator: keystrokeFor('menu:edit:paste-replace'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('paste-replace')
      }
    },
    {
      label: i18n.t('menu.edit.select-all'),
      accelerator: keystrokeFor('menu:edit:select-all'),
      role: 'selectall'
    },

    // add Edit > Preferences on Windows and Linux
    ...(process.platform !== 'darwin')
    ? [
        {
          type: 'separator'
        },
        {
          label: i18n.t('menu.edit.preferences'),
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
AppMenu.Navigation = (i18n) => ({
  label: i18n.t('menu.navigation.title'),
  submenu: [
    {
      label: i18n.t('menu.navigation.play'),
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
      label: i18n.t('menu.navigation.previous-board'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('goPreviousBoard')
      }
    },
    {
      // commented out. we don't route this through the menu.
      // accelerator: keystrokeFor('menu:navigation:next-board'),
      label: i18n.t('menu.navigation.next-board'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('goNextBoard')
      }
    },
    {
      // NOTE for some reason, this accelerator does not trigger a click (CmdOrCtrl+Left)
      accelerator: keystrokeFor('menu:navigation:previous-scene'),
      label: i18n.t('menu.navigation.previous-scene'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('previousScene')
      }
    },
    {
      // NOTE for some reason, this accelerator does not trigger a click (CmdOrCtrl+Right)
      accelerator: keystrokeFor('menu:navigation:next-scene'),
      label: i18n.t('menu.navigation.next-scene'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('nextScene')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.navigation.stop-all-board-audio'),
      // NOTE: menu won't send this, we have to listen for it explicitly in the key handler
      accelerator: keystrokeFor('menu:navigation:stop-all-sounds'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('stopAllSounds')
      }
    },
    {
      label: i18n.t('menu.navigation.toggle-speaking'),
      type: 'checkbox',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleSpeaking')
      }
    },
    {
      label: i18n.t('menu.navigation.audition-board-audio'),
      type: 'checkbox',
      accelerator: keystrokeFor('menu:navigation:toggle-audition'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleAudition')
      }
    }
  ]
})
AppMenu.Boards = (i18n) => ({
  label: i18n.t('menu.boards.title'),
  submenu: [
    {
      accelerator: keystrokeFor('menu:boards:new-board'),
      label: i18n.t('menu.boards.new-board'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('newBoard', 1)
      }
    },
    {
      accelerator: keystrokeFor('menu:boards:new-board-before'),
      label: i18n.t('menu.boards.new-board-before'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('newBoard', -1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:boards:delete-boards'),
      label: i18n.t('menu.boards.delete-boards'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('deleteBoards')
      }
    },
    {
      accelerator: keystrokeFor('menu:boards:delete-boards-go-forward'),
      label: i18n.t('menu.boards.delete-boards-go-forward'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('deleteBoards', 1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:boards:duplicate'),
      label: i18n.t('menu.boards.duplicate-board'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('duplicateBoard')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:boards:reorder-left'),
      label: i18n.t('menu.boards.reorder-left'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('reorderBoardsLeft')
      }
    },
    {
      accelerator: keystrokeFor('menu:boards:reorder-right'),
      label: i18n.t('menu.boards.reorder-right'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('reorderBoardsRight')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:boards:add-audio-file"),
      label: i18n.t('menu.boards.add-audio-file'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('addAudioFile')
      }
    },
    {
      accelerator: keystrokeFor("menu:boards:toggle-new-shot"),
      label: i18n.t('menu.boards.toggle-board-as-new-shot'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleNewShot')
      }
    }
  ]
})
AppMenu.Tools = (i18n) => ({
  label: i18n.t('menu.tools.title'),
  submenu: [
    {
      accelerator: keystrokeFor('menu:tools:light-pencil'),
      label: i18n.t('menu.tools.light-pencil'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'light-pencil')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:brush'),
      label: i18n.t('menu.tools.brush'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'brush')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:tone'),
      label: i18n.t('menu.tools.tone'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'tone')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:pencil'),
      label: i18n.t('menu.tools.pencil'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'pencil')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:pen'),
      label: i18n.t('menu.tools.pen'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'pen')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:note-pen'),
      label: i18n.t('menu.tools.note-pen'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'note-pen')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:eraser'),
      label: i18n.t('menu.tools.eraser'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'eraser')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:tools:clear-all-layers"),
      label: i18n.t('menu.tools.clear-all-layers'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('clear')
      }
    },
    {
      accelerator: keystrokeFor("menu:tools:clear-layer"),
      label: i18n.t('menu.tools.clear-layer'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('clear', true)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('drawing:brush-size:dec'),
      label: i18n.t('menu.tools.smaller-brush'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('brushSize', -1)
      }
    },
    {
      accelerator: keystrokeFor('drawing:brush-size:inc'),
      label: i18n.t('menu.tools.larger-brush'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('brushSize', 1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:tools:palette-color-1"),
      label: i18n.t('menu.tools.use-palette-color1'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 1)
      }
    },
    {
      accelerator: keystrokeFor("menu:tools:palette-color-2"),
      label: i18n.t('menu.tools.use-palette-color2'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 2)
      }
    },
    {
      accelerator: keystrokeFor("menu:tools:palette-color-3"),
      label: i18n.t('menu.tools.use-palette-color3'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 3)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:tools:flip-horizontal"),
      label: i18n.t('menu.tools.flip-horizontal'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('flipBoard')
      }
    },
    {
      label: i18n.t('menu.tools.flip-vertical'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('flipBoard', true)
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.tools.shot-generator'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('revealShotGenerator')
      }
    },
    {
      label: i18n.t('menu.tools.edit-in-photoshop'),
      accelerator: keystrokeFor('menu:tools:edit-in-photoshop'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('openInEditor')
      }
    }
  ]
})
AppMenu.View = (i18n) => ({
  label: i18n.t('menu.view.title'),
  submenu: [
    {
      label: i18n.t('menu.view.cycle-view-mode'),
      accelerator: keystrokeFor('menu:view:cycle-view-mode'),
      click (item, focusedWindow, event) {
        // NOTE this is only triggered by menu directly, not by key
        ipcRenderer.send('cycleViewMode', +1)
      }
    },
    {
      label: i18n.t('menu.view.reverse-cycle-view-mode'),
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
      label: i18n.t('menu.view.toggle-grid-guide'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'grid')
      }
    },
    {
      label: i18n.t('menu.view.toggle-center-guide'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'center')
      }
    },
    {
      label: i18n.t('menu.view.toggle-thirds-guide'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'thirds')
      }
    },
    {
      label: i18n.t('menu.view.toggle-3D-guide'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'perspective')
      }
    },
    {
      label: i18n.t('menu.view.toggle-onion-skin'),
      accelerator: keystrokeFor('menu:view:onion-skin'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleOnionSkin')
      }
    },
    {
      label: i18n.t('menu.view.toggle-captions'),
      accelerator: keystrokeFor('menu:view:toggle-captions'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleCaptions')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.view.toggle-boards-timeline-mode'),
      accelerator: keystrokeFor('menu:view:toggle-timeline'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleTimeline')
      }
    },
    {
      type: 'separator'
    },
    ...SubMenuFragments.View(i18n),
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.view.toggle-fullscreen'),
      accelerator: keystrokeFor("menu:view:toggle-full-screen"),
      role: 'togglefullscreen'
    },
    {
      label: i18n.t('menu.view.actual-size'),
      accelerator: keystrokeFor("menu:view:zoom-reset"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('zoomReset')
      }
    },
    {
      label: i18n.t('menu.view.scale-ui-up'),
      accelerator: process.platform === 'darwin' ? 'CommandOrControl+=' : 'CommandOrControl+Plus',
      click (item, focusedWindow, event) {
        ipcRenderer.send('scale-ui-by', 0.1)
      }
    },
    {
      label: i18n.t('menu.view.scale-ui-down'),
      accelerator: keystrokeFor("menu:view:zoom-out"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('scale-ui-by', -0.1)
      }
    },
    {
      label: i18n.t('menu.view.reset-ui-scale'),
      type: 'normal',
      click (item, focusedWindow, event) {
        ipcRenderer.send('scale-ui-reset', 1)
      }
    }
  ]
})
AppMenu.window = (i18n) => {
  let extension = process.platform == 'darwin'
    ? [
        {
          label: i18n.t('menu.window.zoom'),
          role: 'zoom'
        },
        {
          type: 'separator'
        },
        {
          label: i18n.t('menu.window.bring-all-to-front'),
          role: 'front'
        }
      ]
    : []

  return {
    role: 'window',
    label: i18n.t('menu.window.title'),
    submenu: [
      ...SubMenuFragments.windowing(i18n),
      ...extension
    ]
  }
}
AppMenu.help = (i18n) => ({
  role: 'help',
  label: i18n.t("menu.help.title"),
  submenu: [
    ...SubMenuFragments.help(i18n),
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.help.key-commands'),
      accelerator: keystrokeFor('menu:help:show-key-commands'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('showKeyCommands')
      }
    },
    {
      label: i18n.t('menu.help.show-me-story-tip'),
      accelerator: keystrokeFor('menu:help:show-story-tip'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('showTip')
      }
    }
  ]
})

// macOS only
AppMenu.about = (options = { includePreferences: false }, i18n) => {
  if (process.platform !== 'darwin')
    return []

  let optionalPreferences = options.includePreferences
    ? [
        {
          type: 'separator'
        },
        {
          label: i18n.t('menu.edit.preferences'),
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
          label: i18n.t("menu.about.title")
        },
        ...optionalPreferences,
        // {
        //   label: 'Registration…',
        //   click: () => ipcRenderer.send('registration:open')
        // },
        {
          type: 'separator'
        },
        {
          label: i18n.t("menu.about.services"),
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          role: 'hide',
          label: i18n.t('menu.about.hide')
        },
        {
          role: 'hideothers',
          label: i18n.t('menu.about.hide-others')
        },
        {
          role: 'unhide',
          label: i18n.t('menu.about.unhide')
        },
        {
          type: 'separator'
        },
        {
          role: 'quit',
          label: i18n.t('menu.about.quit')
        }
      ]
    }
  ]
}

const template = (i18n) => [
  ...AppMenu.about({ includePreferences: true }, i18n),
  AppMenu.File(i18n),
  AppMenu.Edit(i18n),
  AppMenu.Navigation(i18n),
  AppMenu.Boards(i18n),
  AppMenu.Tools(i18n),
  AppMenu.View(i18n),
  AppMenu.window(i18n),
  AppMenu.help(i18n),
]

const welcomeTemplate = (i18n) =>[
  ...AppMenu.about({ includePreferences: false }, i18n),
  {
    label: i18n.t('menu.file.title'),
    submenu: [
      {
        label: i18n.t('menu.file.open'),
        accelerator: keystrokeFor('menu:file:open'),
        click (item, focusedWindow, event) {
          ipcRenderer.send('openDialogue')
        }
      }
    ]
  },
  {
    label: i18n.t('menu.edit.title'),
    submenu: [
      // {role: 'undo'},
      // {role: 'redo'},
      // {type: 'separator'},
      {
        role: 'cut',
        label: i18n.t("menu.edit.cut")
      },
      {
        role: 'copy',
        label: i18n.t("menu.edit.copy")
      },
      {
        role: 'paste',
        label: i18n.t("menu.edit.paste")
      },
      // {role: 'pasteandmatchstyle'},
      {
        role: 'delete',
        label: i18n.t("menu.edit.delete")
      },
      {
        role: 'selectall',
        label: i18n.t("menu.edit.select-all")
      }
    ]
  },
  {
    label: i18n.t('menu.view.title'),
    submenu: [
      ...SubMenuFragments.View(i18n)
    ]
  },
  {
    role: 'window',
    label: i18n.t('menu.window.title'),
    submenu: [
      ...SubMenuFragments.windowing(i18n)
    ]
  },
  {
    role: 'help',
    label: i18n.t('menu.help.title'),
    submenu: [
      ...SubMenuFragments.help(i18n)
    ]
  }
]

const shotGeneratorMenu = (i18n) => [
  ...AppMenu.about({ includePreferences: false }, i18n),
  {
    label: i18n.t('menu.file.title'),
    submenu: [
      {
        label: i18n.t('menu.file.open'),
        accelerator: keystrokeFor('menu:file:open'),
        click (item, focusedWindow, event) {
          ipcRenderer.send('openDialogue')
        }
      },
      {
        label: i18n.t('menu.file.export-glTF'),
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:export-gltf')
        }
      }
    ]
  },
  {
    label: i18n.t('menu.edit.title'),
    submenu: [
      {
        label: i18n.t('menu.edit.undo'),
        accelerator: keystrokeFor('menu:edit:undo'),
        click () {
          ipcRenderer.send('shot-generator:edit:undo')
        }
      },
      {
        label: i18n.t('menu.edit.redo'),
        accelerator: keystrokeFor('menu:edit:redo'),
        click () {
          ipcRenderer.send('shot-generator:edit:redo')
        }
      },
      {type: 'separator'},

      {
        role: 'cut',
        label: i18n.t("menu.edit.cut")
      },
      {
        role: 'copy',
        label: i18n.t("menu.edit.copy")
      },
      {
        role: 'paste',
        label: i18n.t("menu.edit.paste")
      },
  
      {
        label: i18n.t('menu.edit.duplicate'),
        accelerator: 'CommandOrControl+d',
        click () {
          ipcRenderer.send('shot-generator:object:duplicate')
        }
      },
  
      {
        label: i18n.t('menu.edit.group-ungroup'),
        accelerator: 'CommandOrControl+g',
        click () {
          ipcRenderer.send('shot-generator:object:group')
        }
      },
      
      {
        label: i18n.t('menu.edit.open-shot-explorer'),
        accelerator: 'CommandOrControl+j',
        click () {
          ipcRenderer.send('shot-generator:show:shot-explorer')
        }
      },
      
      // {role: 'pasteandmatchstyle'},
      {
        role: 'delete',
        label: i18n.t("menu.edit.delete")
      },

      {
        role: 'selectall',
        label: i18n.t("menu.edit.select-all")
      },
      {
        label: i18n.t('menu.edit.drop'),
        accelerator: 'CommandOrControl+b',
        click () {
          ipcRenderer.send('shot-generator:object:drops')
        }
      },
    ]
  },
  {
    label: i18n.t('menu.view.title'),
    submenu: [
      ...SubMenuFragments.View(i18n),
      {
        label: i18n.t('menu.view.enable-fps-meter'),
        type: 'checkbox',
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:menu:view:fps-meter')
        }
      },
      {type: 'separator'},
      {
        label: i18n.t('menu.view.scale-ui-up'),
        accelerator: process.platform === 'darwin' ? 'CommandOrControl+=' : 'CommandOrControl+Plus',
        type: 'normal',
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:menu:view:scale-ui-by', 0.1)
        }
      },
      {
        label: i18n.t('menu.view.scale-ui-down'),
        accelerator: keystrokeFor("menu:view:zoom-out"),
        type: 'normal',
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:menu:view:scale-ui-by', -0.1)
        }
      },
      {
        label: i18n.t('menu.view.reset-ui-scale'),
        accelerator: 'CommandOrControl+0',
        type: 'normal',
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:menu:view:scale-ui-reset', 1)
        }
      },
      {type: 'separator'},
      {
        accelerator: 'CommandOrControl+k',
        label: i18n.t('menu.view.cycle-shading-mode'),
        click () {
          ipcRenderer.send('shot-generator:view:cycleShadingMode')
        }
      },
    ]
  },
  {
    role: 'window',
    label: i18n.t('menu.window.title'),
    submenu: [
      ...SubMenuFragments.windowing(i18n)
    ]
  },
  {
    role: 'help',
    label: i18n.t("menu.help.title"),
    submenu: [
      ...SubMenuFragments.help(i18n)
    ]
  }
]

const setWelcomeMenu = (i18n) => {
  let welcomeMenuInstance = Menu.buildFromTemplate(welcomeTemplate(i18n))
  Menu.setApplicationMenu(welcomeMenuInstance)
}

const setMenu = (i18n) => {
  let menuInstance = Menu.buildFromTemplate(template(i18n))
  Menu.setApplicationMenu(menuInstance)
}

const setShotGeneratorMenu = (i18n) => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(shotGeneratorMenu(i18n)))
}

const setEnableAudition = value =>
  Menu
    .getApplicationMenu().items.find(n => n.label === i18n.t('menu.navigation.title'))
    .submenu.items.find(n => n.label === i18n.t('menu.navigation.audition-board-audio'))
    .checked = value

module.exports = {
  setWelcomeMenu,
  setShotGeneratorMenu,
  setMenu,

  setEnableAudition
}
