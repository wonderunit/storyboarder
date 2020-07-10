   const { Menu, app } = require('electron').remote
const { ipcRenderer, shell } = require('electron')
const isDev = require('electron-is-dev')
const { getInitialStateRenderer } = require('electron-redux')

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
          label: i18n.t('menu.reload'),
          accelerator: 'CmdOrCtrl+R',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
          }
        }
      ]
    : [],
  {
    label: i18n.t('menu.toggleDevTools'),
    accelerator: keystrokeFor('menu:view:toggle-developer-tools'),
    click (item, focusedWindow) {
      if (focusedWindow) focusedWindow.webContents.toggleDevTools()
    }
  }
]
SubMenuFragments.help = (i18n) => [
  {
    label: i18n.t('menu.learnMore'),
    click () { shell.openExternal('https://wonderunit.com/storyboarder') }
  },
  {
    label: i18n.t('menu.gettingStarted'),
    click () { shell.openExternal('https://wonderunit.com/storyboarder/faq/#How-do-I-get-started') }
  },
  {
    label: i18n.t('menu.faq'),
    click () { shell.openExternal('https://wonderunit.com/storyboarder/faq') }
  },
  {
    label: i18n.t('menu.bugSubmit'),
    click () { shell.openExternal('https://github.com/wonderunit/storyboarder/issues/new') }
  }
]
SubMenuFragments.windowing = (i18n) => [
  {
    label: i18n.t('menu.minimize'),
    accelerator: keystrokeFor("menu:window:minimize"),
    role: 'minimize'
  },
  {
    label: i18n.t('menu.closeWindow'),
    accelerator: keystrokeFor("menu:window:close"),
    role: 'close'
  }
]

let AppMenu = {}
AppMenu.File = (i18n) => ({
  label: i18n.t('menu.file'),
  submenu: [
    {
      label: i18n.t('menu.open'),
      accelerator: keystrokeFor('menu:file:open'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('openDialogue')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.save'),
      accelerator: keystrokeFor('menu:file:save'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('save')
      }
    },
    {
      label: i18n.t('menu.saveAs'),
      accelerator: keystrokeFor('menu:file:save-as'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('saveAs')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.exportAnimatedGif'),
      accelerator: keystrokeFor('menu:file:export-animated-gif'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportAnimatedGif')
      }
    },
    {
      label: i18n.t('menu.exportSceneFinalCutProXandPremiere'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportFcp')
      }
    },
    {
      label: i18n.t('menu.exportSceneAsImages'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportImages')
      }
    },
    {
      label: i18n.t('menu.exportVideo'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportVideo')
      }
    },
    {
      label: i18n.t('menu.exportToWeb'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportWeb')
      }
    },
    {
      label: i18n.t('menu.exportProjectAsZIP'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportZIP')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.cleanUpScene…'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportCleanup')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:file:print'),
      label: i18n.t('menu.printPDF'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('exportPDF')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:file:print-worksheet"),
      label: i18n.t('menu.printStoryboarderWorksheet'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('printWorksheet')
      }
    },
    {
      accelerator: keystrokeFor("menu:file:import-worksheets"),
      label: i18n.t('menu.importWorksheets'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('importWorksheets')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.importImagesToNewBoards'),
      accelerator: keystrokeFor("menu:file:import-images"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('importImagesDialogue', false)
      }
    },
    {
      label: i18n.t('menu.importImageAndReplace'),
      accelerator: keystrokeFor("menu:file:import-image-replace"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('importImagesDialogue', true)
      }
    }
  ]
})
AppMenu.Edit = (i18n) => ({
  label: i18n.t('menu.edit'),
  submenu: [
    {
      label: i18n.t('menu.undo'),
      accelerator: keystrokeFor('menu:edit:undo'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('undo')
      }
    },
    {
      label: i18n.t('menu.redo'),
      accelerator: keystrokeFor('menu:edit:redo'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('redo')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.cut'),
      accelerator: keystrokeFor('menu:edit:cut'),
      role: 'cut'
    },
    {
      label: i18n.t('menu.copy'),
      accelerator: keystrokeFor('menu:edit:copy'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('copy')
      }
    },
    {
      label: i18n.t('menu.paste'),
      accelerator: keystrokeFor('menu:edit:paste'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('paste')
      }
    },
    {
      label: i18n.t('menu.pasteAndReplace'),
      accelerator: keystrokeFor('menu:edit:paste-replace'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('paste-replace')
      }
    },
    {
      label: i18n.t('menu.selectAll'),
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
          label: i18n.t('Preferences'),
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
  label: i18n.t('menu.navigation'),
  submenu: [
    {
      label: i18n.t('menu.play'),
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
      label: i18n.t('menu.previousBoard'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('goPreviousBoard')
      }
    },
    {
      // commented out. we don't route this through the menu.
      // accelerator: keystrokeFor('menu:navigation:next-board'),
      label: i18n.t('menu.nextBoard'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('goNextBoard')
      }
    },
    {
      // NOTE for some reason, this accelerator does not trigger a click (CmdOrCtrl+Left)
      accelerator: keystrokeFor('menu:navigation:previous-scene'),
      label: i18n.t('menu.previousScene'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('previousScene')
      }
    },
    {
      // NOTE for some reason, this accelerator does not trigger a click (CmdOrCtrl+Right)
      accelerator: keystrokeFor('menu:navigation:next-scene'),
      label: i18n.t('menu.nextScene'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('nextScene')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.stopAllBoardAudio'),
      // NOTE: menu won't send this, we have to listen for it explicitly in the key handler
      accelerator: keystrokeFor('menu:navigation:stop-all-sounds'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('stopAllSounds')
      }
    },
    {
      label: i18n.t('menu.toggleSpeaking'),
      type: 'checkbox',
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleSpeaking')
      }
    },
    {
      label: i18n.t('menu.auditionBoardAudio'),
      type: 'checkbox',
      accelerator: keystrokeFor('menu:navigation:toggle-audition'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleAudition')
      }
    }
  ]
})
AppMenu.Boards = (i18n) => ({
  label: i18n.t('menu.boards'),
  submenu: [
    {
      accelerator: keystrokeFor('menu:boards:new-board'),
      label: i18n.t('menu.newBoard'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('newBoard', 1)
      }
    },
    {
      accelerator: keystrokeFor('menu:boards:new-board-before'),
      label: i18n.t('menu.newBoardBefore'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('newBoard', -1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:boards:delete-boards'),
      label: i18n.t('menu.deleteBoards'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('deleteBoards')
      }
    },
    {
      accelerator: keystrokeFor('menu:boards:delete-boards-go-forward'),
      label: i18n.t('menu.deleteBoardsGoForward'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('deleteBoards', 1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:boards:duplicate'),
      label: i18n.t('menu.duplicateBoard'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('duplicateBoard')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('menu:boards:reorder-left'),
      label: i18n.t('menu.reorderLeft'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('reorderBoardsLeft')
      }
    },
    {
      accelerator: keystrokeFor('menu:boards:reorder-right'),
      label: i18n.t('menu.reorderRight'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('reorderBoardsRight')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:boards:add-audio-file"),
      label: i18n.t('menu.addAudioFile'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('addAudioFile')
      }
    },
    {
      accelerator: keystrokeFor("menu:boards:toggle-new-shot"),
      label: i18n.t('menu.toggleBoardAsNewShot'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleNewShot')
      }
    }
  ]
})
AppMenu.Tools = (i18n) => ({
  label: i18n.t('menu.tools'),
  submenu: [
    {
      accelerator: keystrokeFor('menu:tools:light-pencil'),
      label: i18n.t('menu.lightPencil'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'light-pencil')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:brush'),
      label: i18n.t('menu.brush'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'brush')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:tone'),
      label: i18n.t('menu.tone'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'tone')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:pencil'),
      label: i18n.t('menu.pencil'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'pencil')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:pen'),
      label: i18n.t('menu.pen'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'pen')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:note-pen'),
      label: i18n.t('menu.notePen'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'note-pen')
      }
    },
    {
      accelerator: keystrokeFor('menu:tools:eraser'),
      label: i18n.t('menu.eraser'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('setTool', 'eraser')
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:tools:clear-all-layers"),
      label: i18n.t('menu.clearAllLayers'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('clear')
      }
    },
    {
      accelerator: keystrokeFor("menu:tools:clear-layer"),
      label: i18n.t('menu.clearLayer'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('clear', true)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor('drawing:brush-size:dec'),
      label: i18n.t('menu.smallerBrush'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('brushSize', -1)
      }
    },
    {
      accelerator: keystrokeFor('drawing:brush-size:inc'),
      label: i18n.t('menu.largerBrush'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('brushSize', 1)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:tools:palette-color-1"),
      label: i18n.t('menu.usePaletteColor1'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 1)
      }
    },
    {
      accelerator: keystrokeFor("menu:tools:palette-color-2"),
      label: i18n.t('menu.usePaletteColor2'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 2)
      }
    },
    {
      accelerator: keystrokeFor("menu:tools:palette-color-3"),
      label: i18n.t('menu.usePaletteColor3'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('useColor', 3)
      }
    },
    {
      type: 'separator'
    },
    {
      accelerator: keystrokeFor("menu:tools:flip-horizontal"),
      label: i18n.t('menu.flipHorizontal'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('flipBoard')
      }
    },
    {
      label: i18n.t('menu.flipVertical'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('flipBoard', true)
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.shotGenerator'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('revealShotGenerator')
      }
    },
    {
      label: i18n.t('menu.editInPhotoshop'),
      accelerator: keystrokeFor('menu:tools:edit-in-photoshop'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('openInEditor')
      }
    }
  ]
})
AppMenu.View = (i18n) => ({
  label: i18n.t('menu.view'),
  submenu: [
    {
      label: i18n.t('menu.cycleViewMode'),
      accelerator: keystrokeFor('menu:view:cycle-view-mode'),
      click (item, focusedWindow, event) {
        // NOTE this is only triggered by menu directly, not by key
        ipcRenderer.send('cycleViewMode', +1)
      }
    },
    {
      label: i18n.t('menu.reverseCycleViewMode'),
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
      label: i18n.t('menu.toggleGridGuide'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'grid')
      }
    },
    {
      label: i18n.t('menu.toggleCenterGuide'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'center')
      }
    },
    {
      label: i18n.t('menu.toggleThirdsGuide'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'thirds')
      }
    },
    {
      label: i18n.t('menu.toggle3DGuide'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleGuide', 'perspective')
      }
    },
    {
      label: i18n.t('menu.toggleOnionSkin'),
      accelerator: keystrokeFor('menu:view:onion-skin'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleOnionSkin')
      }
    },
    {
      label: i18n.t('menu.toggleCaptions'),
      accelerator: keystrokeFor('menu:view:toggle-captions'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('toggleCaptions')
      }
    },
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.toggleBoardsTimelineMode'),
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
      accelerator: keystrokeFor("menu:view:toggle-full-screen"),
      role: 'togglefullscreen',
      label: i18n.t('menu.togglefullscreen')
    },
    {
      label: i18n.t('menu.actualSize'),
      accelerator: keystrokeFor("menu:view:zoom-reset"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('zoomReset')
      }
    },
    {
      label: i18n.t('menu.zoomIn'),
      accelerator: keystrokeFor("menu:view:zoom-in"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('zoomIn')
      }
    },
    {
      label: i18n.t('menu.zoomOut'),
      accelerator: keystrokeFor("menu:view:zoom-out"),
      click (item, focusedWindow, event) {
        ipcRenderer.send('zoomOut')
      }
    }
  ]
})
AppMenu.window = (i18n) => {
  let extension = process.platform == 'darwin'
    ? [
        {
          label: i18n.t('menu.zoom'),
          role: 'zoom'
        },
        {
          type: 'separator'
        },
        {
          label: i18n.t('menu.bringAllToFront'),
          role: 'front'
        }
      ]
    : []

  return {
    role: 'window',
    label: i18n.t('menu.window'),
    submenu: [
      ...SubMenuFragments.windowing(i18n),
      ...extension
    ]
  }
}
AppMenu.help = (i18n) => ({
  role: 'help',
  label: i18n.t("menu.help"),
  submenu: [
    ...SubMenuFragments.help(i18n),
    {
      type: 'separator'
    },
    {
      label: i18n.t('menu.keyCommands'),
      accelerator: keystrokeFor('menu:help:show-key-commands'),
      click (item, focusedWindow, event) {
        ipcRenderer.send('showKeyCommands')
      }
    },
    {
      label: i18n.t('menu.showMeAStoryTip'),
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
          label: i18n.t('Preferences'),
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
          label: i18n.t("menu.about")
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
          label: i18n.t("menu.services"),
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          role: 'hide',
          label: i18n.t('menu.hide')
        },
        {
          role: 'hideothers',
          label: i18n.t('menu.hideothers')
        },
        {
          role: 'unhide',
          label: i18n.t('menu.unhide')
        },
        {
          type: 'separator'
        },
        {
          role: 'quit',
          label: i18n.t('menu.quit')
        }
      ]
    }
  ]
}
const languages = ['en', 'ru']
const languageOptions = (i18n) => languages.map((languageCode) => {
  return {
    label: i18n.t(languageCode),
    type: 'radio',
    checked: i18n.language === languageCode,
    click: () => {
      i18n.changeLanguage(languageCode, () => {
        let observers = i18n.observers.lanugageChanged
        //console.log(i18n)
        if(!observers) return
        for(let i = 0; i < observers.length; i++) {
          observers[i](languageCode)
        }
      })

    }
  }
})

const languageMenu = (i18n) => {
  return {
    label: i18n.t("Language"),
    submenu: languageOptions(i18n)
  }
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
  languageMenu(i18n)
]

const welcomeTemplate = (i18n) =>[
  ...AppMenu.about({ includePreferences: false }, i18n),
  {
    label: i18n.t('menu.file'),
    submenu: [
      {
        label: i18n.t('menu.open'),
        accelerator: keystrokeFor('menu:file:open'),
        click (item, focusedWindow, event) {
          ipcRenderer.send('openDialogue')
        }
      }
    ]
  },
  {
    label: i18n.t('menu.edit'),
    submenu: [
      // {role: 'undo'},
      // {role: 'redo'},
      // {type: 'separator'},
      {
        role: 'cut',
        label: i18n.t("menu.cut")
      },
      {
        role: 'copy',
        label: i18n.t("menu.copy")
      },
      {
        role: 'paste',
        label: i18n.t("menu.paste")
      },
      // {role: 'pasteandmatchstyle'},
      {
        role: 'delete',
        label: i18n.t("menu.delete")
      },
      {
        role: 'selectall',
        label: i18n.t("menu.selectall")
      }
    ]
  },
  {
    label: i18n.t('menu.view'),
    submenu: [
      ...SubMenuFragments.View(i18n)
    ]
  },
  {
    role: 'window',
    label: i18n.t('menu.window'),
    submenu: [
      ...SubMenuFragments.windowing(i18n)
    ]
  },
  {
    role: 'help',
    label: i18n.t('menu.help'),
    submenu: [
      ...SubMenuFragments.help(i18n)
    ]
  },
  languageMenu(i18n)
]

const shotGeneratorMenu = (i18n) => [
  ...AppMenu.about({ includePreferences: false }, i18n),
  {
    label: i18n.t('menu.file'),
    submenu: [
      {
        label: i18n.t('menu.open'),
        accelerator: keystrokeFor('menu:file:open'),
        click (item, focusedWindow, event) {
          ipcRenderer.send('openDialogue')
        }
      },
      {
        label: i18n.t('menu.exportGlTF'),
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:export-gltf')
        }
      }
    ]
  },
  {
    label: i18n.t('menu.edit'),
    submenu: [
      {
        label: i18n.t('menu.undo'),
        accelerator: keystrokeFor('menu:edit:undo'),
        click () {
          ipcRenderer.send('shot-generator:edit:undo')
        }
      },
      {
        label: i18n.t('menu.redo'),
        accelerator: keystrokeFor('menu:edit:redo'),
        click () {
          ipcRenderer.send('shot-generator:edit:redo')
        }
      },
      {type: 'separator'},

      {
        role: 'cut',
        label: i18n.t("menu.cut")
      },
      {
        role: 'copy',
        label: i18n.t("menu.copy")
      },
      {
        role: 'paste',
        label: i18n.t("menu.paste")
      },
  
      {
        accelerator: 'CommandOrControl+d',
        label: i18n.t('menu.duplicate'),
        click () {
          ipcRenderer.send('shot-generator:object:duplicate')
        }
      },
  
      {
        accelerator: 'CommandOrControl+g',
        label: i18n.t('menu.groupUngroup'),
        click () {
          ipcRenderer.send('shot-generator:object:group')
        }
      },
      {
        accelerator: 'CommandOrControl+j',
        label: i18n.t('menu.openShotExplorer'),
        click () {
          ipcRenderer.send('shot-generator:show:shot-explorer')
        }
      },
      
      // {role: 'pasteandmatchstyle'},
      {
        role: 'delete',
        label: i18n.t("menu.delete")
      },

      {
        role: 'selectall',
        label: i18n.t("menu.selectall")
      },
      {
        accelerator: 'CommandOrControl+b',
        label: i18n.t('menu.drop'),
        click () {
          ipcRenderer.send('shot-generator:object:drops')
        }
      },
    ]
  },
  {
    label: i18n.t('menu.view'),
    submenu: [
      ...SubMenuFragments.View(i18n),
      {
        label: i18n.t('menu.enableFPSMeter'),
        type: 'checkbox',
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:menu:view:fps-meter')
        }
      },
      {
        label: i18n.t('menu.scaleUIUp'),
        accelerator: 'CommandOrControl+=',
        type: 'normal',
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:menu:view:zoom', 0.2)
        }
      },
      {
        label: i18n.t('menu.scaleUIDown'),
        accelerator: keystrokeFor("menu:view:zoom-out"),
        type: 'normal',
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:menu:view:zoom', -0.2)
        }
      },
      {
        label: i18n.t('menu.resetUIScale'),
        accelerator: 'CommandOrControl+0',
        type: 'normal',
        click (item, focusedWindow, event) {
          ipcRenderer.send('shot-generator:menu:view:resetZoom', 0)
        }
      }
    ]
  },
  {
    role: 'window',
    label: i18n.t('menu.window'),
    submenu: [
      ...SubMenuFragments.windowing(i18n)
    ]
  },
  {
    role: 'help',
    label: i18n.t("menu.help"),
    submenu: [
      ...SubMenuFragments.help(i18n)
    ]
  },
  languageMenu(i18n)
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
    .getApplicationMenu().items.find(n => n.label === i18n.t('menu.navigation'))
    .submenu.items.find(n => n.label === i18n.t('menu.auditionBoardAudio'))
    .checked = value

module.exports = {
  setWelcomeMenu,
  setShotGeneratorMenu,
  setMenu,

  setEnableAudition
}
