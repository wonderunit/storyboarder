const remoteMain = require('@electron/remote/main')
remoteMain.initialize()
const {app, ipcMain, BrowserWindow, dialog, powerSaveBlocker} = electron = require('electron')

const fs = require('fs-extra')
const path = require('path')
const isDev = require('electron-is-dev')
const trash = require('trash')
const chokidar = require('chokidar')
const os = require('os')
const log = require('./shared/storyboarder-electron-log')
const fileSystem = require('fs')

const prefModule = require('./prefs')
prefModule.init(path.join(app.getPath('userData'), 'pref.json'))


const configureStore = require('./shared/store/configureStore')
const defaultKeyMap = require('./shared/helpers/defaultKeyMap')

const analytics = require('./analytics')

const fountain = require('./vendor/fountain')
const fountainDataParser = require('./fountain-data-parser')
const fountainSceneIdUtil = require('./fountain-scene-id-util')

const importerFinalDraft = require('./importers/final-draft')
const xml2js = require('xml2js')

const MobileServer = require('./express-app/app')

const preferencesUI = require('./windows/preferences')()
const registration = require('./windows/registration/main')
const shotGeneratorWindow = require('./windows/shot-generator/main')
const printProject = require('./windows/print-project/main')
const printWorksheet = require('./windows/print-worksheet/main')

const JWT = require('jsonwebtoken')

const pkg = require('../../package.json')
const util = require('./utils/index')
const {settings:languageSettings} = require('./services/language.config')
const autoUpdater = require('./auto-updater')
const LanguagePreferencesWindow = require('./windows/language-preferences/main')
//https://github.com/luiseduardobrito/sample-chat-electron

//
//
// Menu
// 
const createMenu = require('./main/menu')
// some menu features in main can also be called from a renderer process (via ipcRenderer.send)
//   e.g.: (openDialogue, importImagesDialogue, registration:open, and possibly shot-generator:*)
// `createResponders` allows us to listen to both ipc (for renderer) and a bus (for main), and run the same function
// TODO extract functions which are main-only, they never need to be called via ipc
const EventEmitter = require('events')
let bus = new EventEmitter()
const createResponders = (channel, listener) => {
  ipcMain.on(channel, listener)
  bus.on(channel, listener)
}

/*
TODO
used by license registration, which is disabled currently
see: windows/registration
auth.json can be saved/loaded, e.g.:

    const observeStore = require('./shared/helpers/observeStore')
    const throttle = require('lodash.throttle')
    const authStorage = require('./shared/store/authStorage')
    const persistedState = authStorage.loadState()
    const store = configureStore({ ...persistedState })
    observeStore(
      store,
      state => state.auth,
      throttle(() => authStorage.saveState({ auth: store.getState().auth }), 5000)
    )
*/
const store = configureStore()


if (isDev) {
  const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer')

  app.whenReady().then(() => {
    installExtension([REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS])
      .then((name) => console.log(`[Extensions] ADD ${name}`))
      .catch((err) => console.log('[Extensions] ERR: ', err))
  })
}


let welcomeWindow
let newWindow

let mainWindow
let sketchWindow
let keyCommandWindow

let loadingStatusWindow

let welcomeInprogress
let stsWindow

let scriptWatcher

let powerSaveId = 0

let previousScript

let prefs = prefModule.getPrefs('main')

// state
let currentFile
let currentFileLastModified
let currentPath
let currentScriptDataObject // used to store data until 'createNew' ipc fires back

let toBeOpenedPath

let isLoadingProject

let appServer

// attempt to support older GPUs
app.commandLine.appendSwitch('ignore-gpu-blacklist')
// fix issue where iframe content could not be modified in welcome window
app.commandLine.appendSwitch('disable-site-isolation-trials')

// this only works on mac.
app.on('open-file', (event, path) => {
  event.preventDefault()
  if (app.isReady()) {
    openFile(path)
  } else {
    toBeOpenedPath = path
  }
})

const syncLanguages = (dir, isLanguageFile, array) => {
  let files = fileSystem.readdirSync(dir)
  for(let i = 0; i < files.length; i++) {
    let fileName = files[i]
    let { name, ext } = path.parse(fileName)
    
    if(isLanguageFile(name, ext)) { 
      let data = fs.readFileSync(path.join(dir, fileName))
      let json = JSON.parse(data)
      let language = {}
      language.fileName = name
      language.displayName = json.Name
      array.push(language)
    }
  }
}

app.on('ready', async () => {
  analytics.init(prefs.enableAnalytics)

  const exporterFfmpeg = require('./exporters/ffmpeg')
  let ffmpegVersion = await exporterFfmpeg.checkVersion()
  log.info('ffmpeg version', ffmpegVersion)
  
  // Initial set up of language-settings file
  let settings = {builtInLanguages:[], customLanguages:[]}
  let dir = path.join(__dirname, "locales")
  syncLanguages(dir, (name, ext) => ext === ".json", settings.builtInLanguages)
  dir = path.join(app.getPath('userData'), "locales")
  syncLanguages(dir, (name, ext) => ext === ".json" && name !== "language-settings", settings.customLanguages)
  if(Object.keys(languageSettings.getSettings()).length === 0) {
    let appLocale = app.getLocale()
    if(!settings.builtInLanguages.some((item) => item.fileName === app.getLocale())) {
      appLocale = 'en-US'
    }
    settings.selectedLanguage = appLocale
    settings.defaultLanguage = appLocale
  } else {
    let selectedLanguage = languageSettings.getSettingByKey("selectedLanguage")
    if(!settings.builtInLanguages.some((item) => item.fileName === selectedLanguage) &&
    !settings.customLanguages.some((item) => item.fileName === selectedLanguage)) {
    settings.selectedLanguage = languageSettings.getSettingByKey("defaultLanguage")
}
  }



  languageSettings.setSettings(settings)
  //TODO(): Check if files of custom languages exist



  // load key map
  const keymapPath = path.join(app.getPath('userData'), 'keymap.json')
  let payload = {}
  let shouldOverwrite = false

  if (fs.existsSync(keymapPath)) {
    log.info('Reading', keymapPath)
    try {
      payload = JSON.parse(fs.readFileSync(keymapPath, { encoding: 'utf8' }))

      // detect and migrate Storyboarder 1.5.x keymap
      if (
        payload["menu:tools:pencil"] === "2" &&
        payload["menu:tools:pen"] === "3" &&
        payload["menu:tools:brush"] === "4" &&
        payload["menu:tools:note-pen"] === "5" &&
        payload["menu:tools:eraser"] === "6"
      ) {
        log.info('Detected a Storyboarder 1.5.x keymap. Forcing update to menu:tools:*.')
        // force defaults override
        delete payload["menu:tools:pencil"]
        delete payload["menu:tools:pen"]
        delete payload["menu:tools:brush"]
        delete payload["menu:tools:note-pen"]
        delete payload["menu:tools:eraser"]
        shouldOverwrite = true
      }

      // re-map 1.7.1's Shift to Space
      if (payload["drawing:pan-mode"] === "Shift") {
        log.info('[keymap] re-mapping drawing:pan-mode to space')
        payload["drawing:pan-mode"] = "Space"
        shouldOverwrite = true
      }

    } catch (err) {
      // show error, but don't overwrite the keymap file
      log.error(err)
      dialog.showMessageBox({
        type: 'error',
        message: `Whoops! An error ocurred while trying to read ${keymapPath}.\nUsing default keymap instead.\n\n${err}`
      })
    }
  } else {
    // create new keymap.json
    shouldOverwrite = true
  }


  // merge with defaults
  store.dispatch({
    type: 'SET_KEYMAP',
    payload
  })

  // what changed?
  let a = payload
  let b = store.getState().entities.keymap
  let keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (let key of keys) {
    if (a[key] !== b[key]) {
      log.info(key, 'changed from', a[key], 'to', b[key])
      shouldOverwrite = true
    }
  }

  if (shouldOverwrite) {
    log.info('Writing', keymapPath)
    fs.writeFileSync(keymapPath, JSON.stringify(store.getState().entities.keymap, null, 2) + '\n')
  }



  if (os.platform() === 'darwin') {
    if (!isDev && !app.isInApplicationsFolder()) {
      const { response } = await dialog.showMessageBox({
        type: 'question',
        title: 'Move to Applications folder?',
        message: 'Would you like to move Storyboarder to the Applications folder?',
        buttons: ['Move to Applications', 'Do Not Move'],
        defaultId: 1
      })

      const yes = (response === 0)

      if (yes) {
        try {
          let didMove = app.moveToApplicationsFolder()
          if (!didMove) {
            dialog.showMessageBox(null, {
              type: 'error',
              message: 'Could not move to Applications folder'
            })
          }
        } catch (err) {
          dialog.showMessageBox(null, {
            type: 'error',
            message: err.message
          })
        }
      }
    }
  }

  appServer = new MobileServer()
  appServer.on('pointerEvent', (e)=> {
    log.info('pointerEvent')
  })
  appServer.on('image', (e) => {
    mainWindow.webContents.send('newBoard', 1)
    mainWindow.webContents.send('importImage', e.fileData)
  })
  appServer.on('worksheet', (e) => {
    mainWindow.webContents.send('importWorksheets', [e.fileData])
  })
  appServer.on('error', err => {
    if (err.errno === 'EADDRINUSE') {
      // dialog.showMessageBox(null, {
      //   type: 'error',
      //   message: 'Could not start the mobile web app server. The port was already in use. Is Storyboarder already open?'
      // })
    } else {
      dialog.showMessageBox(null, {
        type: 'error',
        message: err
      })
    }
  })

  await attemptLicenseVerification()



  // setup the menu
  createMenu({
    store,
    send: (event, ...rest) => bus.emit(event, event, ...rest)
  })



  // open the welcome window when the app loads up first
  openWelcomeWindow()

  // TODO why is loading via arg limited to dev mode only?
  // was an argument passed?
  if (isDev) {
    // via https://github.com/electron/electron/issues/4690#issuecomment-217435222
    const argv = process.defaultApp ? process.argv.slice(2) : process.argv

    if (argv[0]) {
      let filePath = path.resolve(argv[0])
      if (fs.existsSync(filePath)) {

        // wait 300 msecs for windows to load
        setTimeout(() => openFile(filePath), 300)

        // prevent welcomeWindow from popping up
        welcomeWindow.hide()
        welcomeWindow.removeAllListeners('ready-to-show')
        return

      } else {
        log.error('Could not load', filePath)
        dialog.showErrorBox(
          'Could not load requested file',
          `Error loading ${filePath}`
        )
      }
    }
  }

  // this only works on mac.
  if (toBeOpenedPath) {
    openFile(toBeOpenedPath)
    return
  }


  setInterval(()=>{ analytics.ping() }, 60*1000)
})

let openKeyCommandWindow = () => {
  if (keyCommandWindow) {
    keyCommandWindow.focus()
    return
  }

  keyCommandWindow = new BrowserWindow({
    width: 1158,
    height: 925,
    maximizable: false,
    center: true,
    show: false,
    resizable: false,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  remoteMain.enable(keyCommandWindow.webContents)
  keyCommandWindow.loadURL(`file://${__dirname}/../keycommand-window.html`)
  keyCommandWindow.once('ready-to-show', () => {
    setTimeout(() => keyCommandWindow.show(), 250) // wait for DOM
  })
  keyCommandWindow.on('close', () => {
    keyCommandWindow = null
  })
}

app.on('activate', ()=> {
  if (!mainWindow && !welcomeWindow) openWelcomeWindow()
})

let openNewWindow = () => {
  // reset state
  currentFile = undefined
  currentFileLastModified = undefined
  currentPath = undefined
  currentScriptDataObject = undefined

  if (!newWindow) {
    // TODO this code is never called currently, as the window is created w/ welcome
    newWindow = new BrowserWindow({
      width: 600,
      height: 580,
      show: false,
      center: true,
      parent: welcomeWindow,
      resizable: false,
      frame: false,
      modal: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })
    remoteMain.enable(newWindow.webContents)
    newWindow.loadURL(`file://${__dirname}/../new.html`)
    newWindow.once('ready-to-show', () => {
      newWindow.show()
    })
  } else {
    // ensure we clear the tabs
    newWindow.reload()
    setTimeout(() => {
      newWindow.show()
    }, 200)
  }
}

let openWelcomeWindow = () => {
  welcomeWindow = new BrowserWindow({
    width: 900,
    height: 600,
    center: true,
    show: false,
    resizable: false,
    frame: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  remoteMain.enable(welcomeWindow.webContents)
  welcomeWindow.loadURL(`file://${__dirname}/../welcome.html`)

  newWindow = new BrowserWindow({
    width: 640,
    height: 580,
    show: false,
    parent: welcomeWindow,
    resizable: false,
    frame: false,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  remoteMain.enable(newWindow.webContents)
  newWindow.loadURL(`file://${__dirname}/../new.html`)

  let recentDocumentsCopy
  if (prefs.recentDocuments) {
    let count = 0
    recentDocumentsCopy = prefs.recentDocuments
    for (var recentDocument of prefs.recentDocuments) {
      try {
        fs.accessSync(recentDocument.filename, fs.R_OK)
      } catch (e) {
        // It isn't accessible
        // log.warn('Recent file no longer exists: ', recentDocument.filename)
        recentDocumentsCopy.splice(count, 1)
      }
      count++
    }
    prefs.recentDocuments = recentDocumentsCopy

    prefModule.set('recentDocuments', recentDocumentsCopy)
  }

  welcomeWindow.once('ready-to-show', () => {
    setTimeout(() => {
      welcomeWindow.show()
      if (!isDev) autoUpdater.init()
      analytics.screenView('welcome')
    }, 300)

  })

  welcomeWindow.once('close', () => {
    welcomeWindow = null
    if (!welcomeInprogress) {
      analytics.event('Application', 'quit')
      app.quit()
    } else {
      welcomeInprogress = false
    }
  })
}

let openFile = filepath => {
  let filename = path.basename(filepath)
  let extname = path.extname(filepath)

  if (extname === '.storyboarder') {
    /// LOAD STORYBOARDER FILE
    addToRecentDocs(filepath, {
      boards: 2,
      time: 3000,
    })
    loadStoryboarderWindow(filepath)

  } else if (extname === '.fdx') {
    fs.readFile(filepath, 'utf-8', (err, data) => {
      if (err) {
        dialog.showMessageBox({
          type: 'error',
          message: 'Could not open Final Draft file.\n' + error.message,
        })
        return
      }
      let parser = new xml2js.Parser()
      parser.parseString(data, (err, fdxObj) => {
        if (err) {
          dialog.showMessageBox({
            type: 'error',
            message: 'Could not parse Final Draft XML.\n' + error.message,
          })
          return
        }

        currentFile = filepath
        currentPath = path.join(path.dirname(currentFile), 'storyboards')

        try {
          let [scriptData, locations, characters, metadata] = processFdxData(fdxObj)

          findOrCreateProjectFolder([
            scriptData,
            locations,
            characters,
            metadata
          ])
        } catch (error) {
          log.error(error)
          dialog.showMessageBox({
            type: 'error',
            message: 'Could not parse Final Draft data.\n' + error.message
          })
        }
      })
    })

  } else if (extname == '.fountain') {
    currentFile = filepath
    currentPath = path.join(path.dirname(currentFile), 'storyboards')

    fs.readFile(filepath, 'utf-8', (err, data) => {
      if (err) {
        dialog.showMessageBox({
          type: 'error',
          message: 'Could not read Fountain script.\n' + err.message,
        })
        return
      }
      try {
        data = ensureFountainSceneIds(filepath, data)
        findOrCreateProjectFolder(
          processFountainData(data, true, false)
        )
      } catch (error) {
        log.error(error)
        dialog.showMessageBox({
          type: 'error',
          message: 'Could not parse Fountain script.\n' + error.message,
        })
      }
    })
  }
}

const findOrCreateProjectFolder = (scriptDataObject) => {
  // check for storyboard.settings file
  if (fs.existsSync(path.join(currentPath, 'storyboard.settings'))) {
    // project already exists
    let boardSettings = JSON.parse(fs.readFileSync(path.join(currentPath, 'storyboard.settings')))
    if (!boardSettings.lastScene) {
      boardSettings.lastScene = 0
    }

    switch (path.extname(currentFile)) {
      case '.fdx':
        // log.info('got existing .fdx project data')
        setWatchedScript()
        addToRecentDocs(currentFile, scriptDataObject[3])
        loadStoryboarderWindow(currentFile, scriptDataObject[0], scriptDataObject[1], scriptDataObject[2], boardSettings, currentPath)
        break
      case '.fountain':
        // log.info('got existing .fountain project data')
        setWatchedScript()
        addToRecentDocs(currentFile, scriptDataObject[3])
        loadStoryboarderWindow(currentFile, scriptDataObject[0], scriptDataObject[1], scriptDataObject[2], boardSettings, currentPath)
        break
    }

  } else {
    // create
    currentScriptDataObject = scriptDataObject
    newWindow.webContents.send('setTab', 1)
    newWindow.show()
    // wait for 'createNew' via ipc, which triggers createAndLoadProject
  }
}

let openDialogue = () => {
  dialog.showOpenDialog({
    title: "Open Script or Storyboarder",
    filters:[
      {
        name: 'Screenplay or Storyboarder',
        extensions: [
          'storyboarder',
          'fountain',
          'fdx'
        ]
      },
    ]}
  ).then(({ filePaths }) => {
    if (filePaths.length) {
      openFile(filePaths[0])
    }
  })
  .catch(err => log.error(err))
}

let importImagesDialogue = (shouldReplace = false) => {
  dialog.showOpenDialog(
    {
      title:"Import Boards",
      filters:[
        {name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'psd']},
      ],
      properties: [
        "openFile",
        ...(
          os.platform() === 'darwin'
            // macOS can select a folder
            ? ["openDirectory"]
            // ... Windows and Linux can’t
            : []
        ),
        ...(
          shouldReplace
            // "replace" only allows a single image
            ? []
            // "import new" allows multiple images
            : ["multiSelections"]
        )
      ]
    }
  ).then(({ filePaths }) => {
    if (filePaths.length) {
      filePaths = filePaths.sort()
      let filepathsRecursive = []
      let handleDirectory = (dirPath) => {
        let innerFilenames = fs.readdirSync(dirPath)
        for(let innerFilename of innerFilenames) {
          var innerFilePath = path.join(dirPath, innerFilename)
          let stats = fs.statSync(innerFilePath)
          if(stats.isFile()) {
            filepathsRecursive.push(innerFilePath)
          } else if(stats.isDirectory()) {
            handleDirectory(innerFilePath)
          }
        }
      }
      for(let filepath of filePaths) {
        let stats = fs.statSync(filepath)
        if(stats.isFile()) {
          filepathsRecursive.push(filepath)
        } else if(stats.isDirectory()) {
          handleDirectory(filepath)
        }
      }

      if (shouldReplace) {
        mainWindow.webContents.send('importImageAndReplace', filepathsRecursive)
      } else {
        mainWindow.webContents.send('insertNewBoardsWithFiles', filepathsRecursive)
      }
    }
  }).catch(err => {
    log.error(err)
  })
}

const processFdxData = fdxObj => {
  try {
    ensureFdxSceneIds(fdxObj)
  } catch (err) {
    throw new Error('Could not add scene ids to Final Draft data.\n' + error.message)
    return
  }

  let scriptData = importerFinalDraft.importFdxData(fdxObj)

  let locations = importerFinalDraft.getScriptLocations(scriptData)
  let characters = importerFinalDraft.getScriptCharacters(scriptData)

  let metadata = {
    type: 'script',

    // TODO is this metadata needed?
    //
    // sceneBoardsCount: 0,
    // sceneCount: 0,
    // totalMovieTime: 0,

    title: path.basename(currentFile, path.extname(currentFile))
  }

  return [scriptData, locations, characters, metadata]
}

let processFountainData = (data, create, update) => {
  let scriptData = fountain.parse(data, true)
  let locations = fountainDataParser.getLocations(scriptData.tokens)
  let characters = fountainDataParser.getCharacters(scriptData.tokens)
  scriptData = fountainDataParser.parse(scriptData.tokens)
  let metadata = {type: 'script', sceneBoardsCount: 0, sceneCount: 0, totalMovieTime: 0}

  let boardsDirectoryFolders = fs.existsSync(currentPath)
    ? fs.readdirSync(currentPath).filter(file => fs.statSync(path.join(currentPath, file)).isDirectory())
    : []

  // fallback title in case one is not provided
  metadata.title = path.basename(currentFile, path.extname(currentFile))

  for (var node of scriptData) {
    switch (node.type) {
      case 'title':
        if (node.text) { metadata.title = node.text.replace(/<(?:.|\n)*?>/gm, '') }
        break
      case 'scene':
        metadata.sceneCount++
        let id
        if (node.scene_id) {
          id = node.scene_id.split('-')
          if (id.length>1) {
            id = id[1]
          } else {
            id = id[0]
          }
        } else {
          id = 'G' + metadata.sceneCount
        }
        for (var directory in boardsDirectoryFolders) {
          if (directory.includes(id)) {
            metadata.sceneBoardsCount++
            // load board file and get stats and shit
            break
          }
        }
        break
    }
  }

  let scenesWithSceneNumbers = scriptData.reduce(
    (coll, node) =>
      (node.type === 'scene' && node.scene_number)
        ? coll + 1
        : coll
  , 0)
  if (scenesWithSceneNumbers === 0) throw new Error('Could not find any numbered scenes in this Fountain script.')

  switch (scriptData[scriptData.length-1].type) {
    case 'section':
      metadata.totalMovieTime = scriptData[scriptData.length-1].time + scriptData[scriptData.length-1].duration
      break
    case 'scene':
      let lastNode = scriptData[scriptData.length-1]['script'][scriptData[scriptData.length-1]['script'].length-1]
      metadata.totalMovieTime = lastNode.time + lastNode.duration
      break
  }

  // unused
  // if (update) {
  //   mainWindow.webContents.send('updateScript', 1)//, diffScene)
  // }

  return [scriptData, locations, characters, metadata]
}

const onScriptFileChange = (eventType, filepath, stats) => {
  if (eventType === 'change') {

    // check last modified to determine if we should reload
    let lastModified = fs.statSync(currentFile).mtimeMs
    if (currentFileLastModified && (lastModified === currentFileLastModified)) {
      // file hasn't changed. cancel.
      return
    }
    currentFileLastModified = lastModified

    // load
    let data = fs.readFileSync(filepath, 'utf-8')

    if (path.extname(filepath) === '.fountain') {
      try {
        // write scene ids for any new scenes
        data = ensureFountainSceneIds(filepath, data)
        let [scriptData, locations, characters, metadata] = processFountainData(data, false, false)
        mainWindow.webContents.send('reloadScript', [scriptData, locations, characters])
      } catch (error) {
        dialog.showMessageBox({
          type: 'error',
          message: 'Could not reload script.\n' + error.message
        })
      }

    } else if (path.extname(filepath) === '.fdx') {
      let parser = new xml2js.Parser()
      parser.parseString(data, (err, fdxObj) => {
        if (err) {
          dialog.showMessageBox({
            type: 'error',
            message: 'Could not parse Final Draft XML.\n' + error.message,
          })
          return
        }

        try {
          ensureFdxSceneIds(fdxObj)
          let [scriptData, locations, characters, metadata] = processFdxData(fdxObj)
          mainWindow.webContents.send('reloadScript', [scriptData, locations, characters])
        } catch (error) {
          dialog.showMessageBox({
            type: 'error',
            message: 'Could not reload script.\n' + error.message
          })
        }
      })
    }
  }
}

const setWatchedScript = () => {
  if (scriptWatcher) { scriptWatcher.close() }

  scriptWatcher = chokidar.watch(currentFile, {
    disableGlobbing: true // treat file strings as literal file names
  })
  scriptWatcher.on('all', onScriptFileChange)
}

const ensureFdxSceneIds = fdxObj => {
  let added = importerFinalDraft.insertSceneIds(fdxObj)

  if (added.length) {
    let builder = new xml2js.Builder({
      xmldec: {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: false
      }
    })
    let xml = builder.buildObject(fdxObj)
    fs.writeFileSync(currentFile, xml)

    dialog.showMessageBox({
      type: 'info',
      message: 'We added scene IDs to the Final Draft script',
      detail: "Scene IDs are what we use to make sure we put the storyboards in the right place. " +
              "If you have your script open in an editor, you should reload it. " +
              "Also, you can change your script around as much as you want, "+
              "but please don't change the scene IDs.",
      buttons: ['OK']
    })
  }
}

const ensureFountainSceneIds = (filePath, data) => {
  let sceneIdScript = fountainSceneIdUtil.insertSceneIds(data)

  if (sceneIdScript[1]) {
    dialog.showMessageBox({
      type: 'info',
      message: 'We added scene IDs to your fountain script.',
      detail: "Scene IDs are what we use to make sure we put the storyboards in the right place. If you have your script open in an editor, you should reload it. Also, you can change your script around as much as you want, but please don't change the scene IDs.",
      buttons: ['OK']
    })

    fs.writeFileSync(filePath, sceneIdScript[0])
    data = sceneIdScript[0]
  }

  return data
}


// unused
// let getSceneDifference = (scriptA, scriptB) => {
//   let i = 0
//   for (var node of scriptB) {
//     if(!scriptA[i]) {
//       return i
//     }
//     if (JSON.stringify(node) !== JSON.stringify(scriptA[i])) {
//       return i
//     }
//     i++
//   }
//   return false
// }


////////////////////////////////////////////////////////////
// new functions
////////////////////////////////////////////////////////////

const createAndLoadScene = async aspectRatio => {
  // if directory exists, showSaveDialog will prompt to confirm overwrite
  let { canceled, filePath } = await dialog.showSaveDialog({
    title: "New Storyboard",
    buttonLabel: "Create",
    defaultPath: app.getPath('documents'),
    options: {
      properties: [
        // show overwrite confirmation on linux (UNTESTED)
        // is `true` the default? not sure …
        "showOverwriteConfirmation"
      ]
    }
  })

  if (canceled) return

  // if the filePath exists ...
  if (fs.existsSync(filePath)) {
    // ... and is a folder ...
    if (fs.lstatSync(filePath).isDirectory()) {
      // ... try to trash it ...
      log.info('\ttrash existing folder', filePath)
      await trash(filePath)
    } else {
      dialog.showMessageBox(null, {
        message: "Could not overwrite file " + path.basename(filePath) + ". Only folders can be overwritten."
      })
      return
    }
  }

  fs.mkdirSync(filePath)

  let boardName = path.basename(filePath)
  let storyboarderFilePath = path.join(filePath, boardName + '.storyboarder')

  let newBoardObject = {
    version: pkg.version,
    aspectRatio: aspectRatio,
    fps: prefModule.getPrefs().lastUsedFps || 24,
    defaultBoardTiming: prefs.defaultBoardTiming,
    boards: []
  }

  fs.writeFileSync(storyboarderFilePath, JSON.stringify(newBoardObject))
  fs.mkdirSync(path.join(filePath, 'images'))

  addToRecentDocs(storyboarderFilePath, newBoardObject)
  loadStoryboarderWindow(storyboarderFilePath)

  analytics.event('Application', 'new', newBoardObject.aspectRatio)
}

const createAndLoadProject = aspectRatio => {
  fs.ensureDirSync(currentPath)

  let boardSettings = {
    lastScene: 0,
    aspectRatio
  }
  fs.writeFileSync(path.join(currentPath, 'storyboard.settings'), JSON.stringify(boardSettings))

  setWatchedScript()
  addToRecentDocs(currentFile, currentScriptDataObject[3])
  loadStoryboarderWindow(currentFile, currentScriptDataObject[0], currentScriptDataObject[1], currentScriptDataObject[2], boardSettings, currentPath)
}

let loadStoryboarderWindow = (filename, scriptData, locations, characters, boardSettings, currentPath) => {
  isLoadingProject = true

  if (welcomeWindow) {
    welcomeWindow.hide()
  }
  if (newWindow) {
    newWindow.hide()
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }

  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize
  mainWindow = new BrowserWindow({
    acceptFirstMouse: true,
    backgroundColor: '#333333',

    width: Math.min(width, 2480),
    height: Math.min(height, 1350),

    title: path.basename(filename),

    minWidth: 1024,
    minHeight: 640,
    show: false,
    resizable: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      webgl: true,
      experimentalFeatures: true,
      experimentalCanvasFeatures: true,
      devTools: true,
      plugins: true,
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  remoteMain.enable(mainWindow.webContents)

  let projectName = path.basename(filename, path.extname(filename))
  loadingStatusWindow = new BrowserWindow({
    width: 450,
    height: 150,
    backgroundColor: '#333333',
    show: false,
    frame: false,
    resizable: isDev ? true : false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  remoteMain.enable(loadingStatusWindow.webContents)
  loadingStatusWindow.loadURL(`file://${__dirname}/../loading-status.html?name=${encodeURIComponent(projectName)}`)
  loadingStatusWindow.once('ready-to-show', () => {
    loadingStatusWindow.show()
  })


  // http://stackoverflow.com/a/39305399
  // https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
  const onErrorInWindow = (event, message, source, lineno, colno, error) => {
    if (isDev) {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.webContents.openDevTools()
      }
    }
    dialog.showMessageBox({
      title: 'Error',
      type: 'error',
      message: message,
      detail: 'In file: ' + source + '#' + lineno + ':' + colno
    })
    log.error(message, source, lineno, colno)
    analytics.exception(message, source, lineno)
  }

  ipcMain.on('errorInWindow', onErrorInWindow)
  mainWindow.loadURL(`file://${__dirname}/../main-window.html`)
  mainWindow.once('ready-to-show', () => {
    mainWindow.webContents.send('load', [filename, scriptData, locations, characters, boardSettings, currentPath])
    isLoadingProject = false
    analytics.screenView('main')
  })

  // TODO could move this to main-window code?
  if (isDev) {
    mainWindow.webContents.on('devtools-focused', event => { mainWindow.webContents.send('devtools-focused') })
    mainWindow.webContents.on('devtools-closed', event => { mainWindow.webContents.send('devtools-closed') })
  }

  // via https://github.com/electron/electron/blob/master/docs/api/web-contents.md#event-will-prevent-unload
  //     https://github.com/electron/electron/pull/9331
  //
  // if beforeunload is telling us to prevent unload ...
  mainWindow.webContents.on('will-prevent-unload', event => {
    const choice = dialog.showMessageBoxSync({
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm',
      message: 'Your Storyboarder file is not saved. Are you sure you want to close the workspace?'
    })

    const leave = (choice === 0)

    if (leave) {
      // ignore the default behavior of preventing unload
      // ... which means we'll actually ... _allow_ unload :)
      event.preventDefault()
    }
  })

  mainWindow.once('closed', event => {
    if (welcomeWindow) {
      ipcMain.removeListener('errorInWindow', onErrorInWindow)
      welcomeWindow.webContents.send('updateRecentDocuments')
      // when old workspace is closed,
      //   show the welcome window
      // EXCEPT if we're currently loading a new workspace
      //        (to take old's place)
      if (!isLoadingProject) {
        welcomeWindow.show()
        analytics.screenView('welcome')
      }

      appServer.setCanImport(false)

      // stop watching any fountain files
      if (scriptWatcher) { scriptWatcher.close() }

      analytics.event('Application', 'close')
    }
  })
}


let addToRecentDocs = (filename, metadata) => {
  let prefs = prefModule.getPrefs('add to recent')

  let recentDocuments
  if (!prefs.recentDocuments) {
    recentDocuments = []
  } else {
    recentDocuments = prefs.recentDocuments
  }

  let currPos = 0

  for (var document of recentDocuments) {
    if (document.filename == filename) {
      recentDocuments.splice(currPos, 1)
      break
    }
    currPos++
  }

  let recentDocument = metadata

  if (!recentDocument.title) {
    let title = filename.split(path.sep)
    title = title[title.length-1]
    title = title.split('.')
    title.splice(-1,1)
    title = title.join('.')
    recentDocument.title = title
  }

  recentDocument.filename = filename
  recentDocument.time = Date.now()
  recentDocuments.unshift(recentDocument)
  // save
  prefModule.set('recentDocuments', recentDocuments)
}

let attemptLicenseVerification = async () => {
  const nodeFetch = require('node-fetch')
  const { VERIFICATION_URL, checkLicense } = require('./models/license')

  let token
  let license
  let licenseKeyPath = path.join(app.getPath('userData'), 'license.key')

  try {
    token = fs.readFileSync(licenseKeyPath, { encoding: 'utf8' })
  } catch (err) {
    if (err.code === 'ENOENT') {
      log.info('No license key found')
      return
    } else {
      log.error('Could not load license.key')
      log.error(err)
      return
    }
  }

  try {
    if (await checkLicense(token, { fetcher: nodeFetch })) {

      log.info('license accepted')

      store.dispatch({
        type: 'SET_LICENSE',
        payload: JWT.decode(token)
      })

    } else {
      dialog.showMessageBox({
        message: 'License key is no longer valid.'
      })
      log.info('Removing invalid license key at', licenseKeyPath)
      prefModule.revokeLicense()
      await trash(licenseKeyPath)
    }
  } catch (err) {
    log.error(err)
    dialog.showMessageBox({
      type: 'error',
      message: `An error occurred while checking the license key.\n\n${err}`
    })
  }
}

////////////////////////////////////////////////////////////
// ipc passthrough
////////////////////////////////////////////////////////////

//////////////////
// Main Window
//////////////////

createResponders('newBoard', (e, arg)=> {
  mainWindow.webContents.send('newBoard', arg)
})

createResponders('deleteBoards', (e, arg)=> {
  mainWindow.webContents.send('deleteBoards', arg)
})

createResponders('duplicateBoard', (e, arg)=> {
  mainWindow.webContents.send('duplicateBoard')
})

createResponders('reorderBoardsLeft', (e, arg)=> {
  mainWindow.webContents.send('reorderBoardsLeft')
})

createResponders('reorderBoardsRight', (e, arg)=> {
  mainWindow.webContents.send('reorderBoardsRight')
})

createResponders('togglePlayback', (e, arg)=> {
  mainWindow.webContents.send('togglePlayback')
})

createResponders('openInEditor', (e, arg)=> {
  mainWindow.webContents.send('openInEditor')
})

createResponders('goPreviousBoard', (e, arg)=> {
  mainWindow.webContents.send('goPreviousBoard')
})

createResponders('goNextBoard', (e, arg)=> {
  mainWindow.webContents.send('goNextBoard')
})

createResponders('previousScene', (e, arg)=> {
  mainWindow.webContents.send('previousScene')
})

createResponders('nextScene', (e, arg)=> {
  mainWindow.webContents.send('nextScene')
})

createResponders('copy', (e, arg)=> {
  mainWindow.webContents.send('copy')
})

createResponders('paste', (e, arg)=> {
  mainWindow.webContents.send('paste')
})

createResponders('paste-replace', () => {
  mainWindow.webContents.send('paste-replace')
})

/// TOOLS

createResponders('undo', (e, arg)=> {
  mainWindow.webContents.send('undo')
})


createResponders('redo', (e, arg)=> {
  mainWindow.webContents.send('redo')
})

createResponders('setTool', (e, arg) =>
  mainWindow.webContents.send('setTool', arg))

createResponders('useColor', (e, arg)=> {
  mainWindow.webContents.send('useColor', arg)
})

createResponders('clear', (e, arg) => {
  mainWindow.webContents.send('clear', arg)
})

createResponders('brushSize', (e, arg)=> {
  mainWindow.webContents.send('brushSize', arg)
})

createResponders('flipBoard', (e, arg)=> {
  mainWindow.webContents.send('flipBoard', arg)
})

/// VIEW

createResponders('cycleViewMode', (e, arg)=> {
  mainWindow.webContents.send('cycleViewMode', arg)
})

createResponders('toggleCaptions', (e, arg)=> {
  mainWindow.webContents.send('toggleCaptions', arg)
})

createResponders('toggleTimeline', () =>
  mainWindow.webContents.send('toggleTimeline'))

//////////////////
// Welcome Window
//////////////////


ipcMain.on('openFile', (e, arg)=> {
  openFile(arg)
})

createResponders('openDialogue', (e, arg) => {
  openDialogue()
})

createResponders('importImagesDialogue', (e, arg) => {
  importImagesDialogue(arg)
  mainWindow.webContents.send('importNotification', arg)
})

ipcMain.on('createNew', (e, aspectRatio) => {
  newWindow.hide()

  let isProject = currentFile && (path.extname(currentFile) === '.fdx' || path.extname(currentFile) === '.fountain')
  if (isProject) {
    createAndLoadProject(aspectRatio)
  } else {
    createAndLoadScene(aspectRatio)
  }
})

ipcMain.on('openNewWindow', (e, arg)=> {
  openNewWindow()
})

ipcMain.on('preventSleep', ()=> {
  powerSaveId = powerSaveBlocker.start('prevent-display-sleep')
})

ipcMain.on('resumeSleep', ()=> {
  powerSaveBlocker.stop(powerSaveId)
})

/// menu pass through

ipcMain.on('goBeginning', (event, arg)=> {
  mainWindow.webContents.send('goBeginning')
})

ipcMain.on('goPreviousScene', (event, arg)=> {
  mainWindow.webContents.send('goPreviousScene')
})

ipcMain.on('goPrevious', (event, arg)=> {
  mainWindow.webContents.send('goPrevious')
})

ipcMain.on('goNext', (event, arg)=> {
  mainWindow.webContents.send('goNext')
})

ipcMain.on('goNextScene', (event, arg)=> {
  mainWindow.webContents.send('goNextScene')
})

createResponders('toggleSpeaking', (event, arg)=> {
  mainWindow.webContents.send('toggleSpeaking')
})

createResponders('stopAllSounds', event =>
  mainWindow.webContents.send('stopAllSounds'))

createResponders('addAudioFile', event =>
  mainWindow.webContents.send('addAudioFile'))

ipcMain.on('playsfx', (event, arg)=> {
  if (welcomeWindow) {
    welcomeWindow.webContents.send('playsfx', arg)
  }
})

ipcMain.on('test', (event, arg)=> {
  log.info('test', arg)
})

ipcMain.on('textInputMode', (event, arg)=> {
  mainWindow.webContents.send('textInputMode', arg)
})

createResponders('preferences', (event, arg) => {
  preferencesUI.show()
  analytics.screenView('preferences')
})

createResponders('toggleGuide', (event, arg) => {
  mainWindow.webContents.send('toggleGuide', arg)
})

createResponders('toggleOnionSkin', event =>
  mainWindow.webContents.send('toggleOnionSkin'))

createResponders('toggleNewShot', (event, arg) => {
  mainWindow.webContents.send('toggleNewShot', arg)
})

createResponders('showTip', (event, arg) => {
  mainWindow.webContents.send('showTip', arg)
})

createResponders('exportAnimatedGif', (event, arg) => {
  mainWindow.webContents.send('exportAnimatedGif', arg)
})

createResponders('exportVideo', (event, arg) => {
  mainWindow.webContents.send('exportVideo', arg)
})

createResponders('exportFcp', (event, arg) => {
  mainWindow.webContents.send('exportFcp', arg)
})

createResponders('exportImages', (event, arg) => {
  mainWindow.webContents.send('exportImages', arg)
})

createResponders('exportWeb', (event, arg) => {
  mainWindow.webContents.send('exportWeb', arg)
})
createResponders('exportZIP', (event, arg) => {
  mainWindow.webContents.send('exportZIP', arg)
})

createResponders('exportCleanup', (event, arg) => {
  mainWindow.webContents.send('exportCleanup', arg)
})

createResponders('save', (event, arg) => {
  mainWindow.webContents.send('save', arg)
})

createResponders('saveAs', (event, arg) => {
  mainWindow.webContents.send('saveAs', arg)
})

ipcMain.on('prefs:change', (event, arg) => {
  !mainWindow.isDestroyed() && mainWindow.webContents.send('prefs:change', arg)
})

createResponders('showKeyCommands', (event, arg) => {
  openKeyCommandWindow()
  analytics.screenView('key commands')
})

ipcMain.on('analyticsScreen', (event, screenName) => {
  analytics.screenView(screenName)
})

ipcMain.on('analyticsEvent', (event, category, action, label, value) => {
  analytics.event(category, action, label, value)
})

ipcMain.on('analyticsTiming', (event, category, name, ms) => {
  analytics.timing(category, name, ms)
})

ipcMain.on('log', (event, opt) => {
  !loadingStatusWindow.isDestroyed() && loadingStatusWindow.webContents.send('log', opt)
})

ipcMain.on('workspaceReady', event => {
  appServer.setCanImport(true)

  !loadingStatusWindow.isDestroyed() && loadingStatusWindow.hide()

  if (!mainWindow) return
  
  if (os.platform() == 'win32') {
    setTimeout(()=> {mainWindow.show()}, 1000)
  } else {
    mainWindow.show()
  }

  // only after the workspace is ready will it start getting future focus events
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('focus')

    // if we're on a script-based project ...
    let isProject = currentFile && (path.extname(currentFile) === '.fdx' || path.extname(currentFile) === '.fountain')
    if (isProject) {
      // force an onScriptFileChange call
      onScriptFileChange('change', currentFile)
    }
  })
})

const notifyAllsWindows = (event, ...args) => {
  let allWindows = BrowserWindow.getAllWindows()
  for(let i = 0; i < allWindows.length; i ++) {
    if(! allWindows[i]) continue
    allWindows[i].send(event, ...args)
  }
}

ipcMain.on('languageChanged', (event, lng) => {
  languageSettings._loadFile()
  notifyAllsWindows("languageChanged", lng)
})

ipcMain.on('languageModified', (event, lng) => {
  notifyAllsWindows("languageModified", lng)
})

ipcMain.on('languageAdded', (event, lng) => {
  languageSettings._loadFile()
  notifyAllsWindows("languageAdded", lng)
})

ipcMain.on('languageRemoved', (event, lng) => {
  languageSettings._loadFile()
  notifyAllsWindows("languageRemoved", lng)
})

ipcMain.on('getCurrentLanguage', (event) => {
  event.returnValue = languageSettings.getSettingByKey("selectedLanguage")
})

ipcMain.on('openLanguagePreferences', (event) => {
  let win = LanguagePreferencesWindow.getWindow()
  if (win) {
    LanguagePreferencesWindow.reveal()
  } else {
    LanguagePreferencesWindow.createWindow(() => {LanguagePreferencesWindow.reveal()})
  }
})



// PDF Export
createResponders('exportPDF', () => {
  if (!mainWindow) return

  printProject.show({ parent: mainWindow })
  analytics.event('Board', 'show print window')
})
ipcMain.handle('exportPDF:getData', async () => {
  if (!mainWindow) return

  return await new Promise(resolve => {
    ipcMain.once('exportPDF:getProjectData-response', (event, projectData) => {
      resolve({
        currentFilePath: currentFile,
        projectData
      })
    })
    mainWindow.webContents.send('exportPDF:getProjectData-request')
  })
})

// Worksheet Export
createResponders('printWorksheet', () => {
  if (!mainWindow) return

  printWorksheet.show({ parent: mainWindow })

  analytics.event('Board', 'show print worksheet window')
})
ipcMain.handle('printWorksheet:getData', async () => {
  if (!mainWindow) return

  return await new Promise(resolve => {
    ipcMain.once('printWorksheet:getProjectData-response', (event, projectData) => {
      resolve({
        currentFilePath: currentFile,
        projectData
      })
    })
    mainWindow.webContents.send('printWorksheet:getProjectData-request')
  })
})

// Worksheet Import
createResponders('importWorksheets', async (event, arg) => {
  try {
    let { filePaths } = await dialog.showOpenDialog({
      title: 'Import Worksheet',
      filters:[
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
      ],
      properties: [
        'openFile',
      ]
    })

    if (filePaths.length) {
      mainWindow.webContents.send('importWorksheets', filePaths)
      mainWindow.webContents.send('importNotification', arg)
    }

  } catch (err) {
    log.error(err)
  }
})

ipcMain.on('exportPrintableWorksheetPdf', (event, sourcePath) =>
  mainWindow.webContents.send('exportPrintableWorksheetPdf', sourcePath)
)

createResponders('toggleAudition', (event) => {
  mainWindow.webContents.send('toggleAudition')
})

// uploader > main-window
ipcMain.on('signInSuccess', (event, response) => {
  mainWindow.webContents.send('signInSuccess', response)
})

createResponders('revealShotGenerator',
  event => mainWindow.webContents.send('revealShotGenerator'))

createResponders('zoomReset',
  event => mainWindow.webContents.send('zoomReset'))
createResponders('scale-ui-by',
  (event, value) => mainWindow.webContents.send('scale-ui-by', value))
createResponders('scale-ui-reset',
  (event, value) => mainWindow.webContents.send('scale-ui-reset', value))

createResponders('saveShot',
  (event, data) => mainWindow.webContents.send('saveShot', data))
ipcMain.on('insertShot',
  (event, data) => mainWindow.webContents.send('insertShot', data))
ipcMain.on('storyboarder:get-boards',
  event => mainWindow.webContents.send('storyboarder:get-boards'))
ipcMain.on('shot-generator:get-boards', (event, data) => {
  let win = shotGeneratorWindow.getWindow()
  if (win) {
    win.send('shot-generator:get-boards', data)
  }
})
ipcMain.on('storyboarder:get-board',
  (event, uid) => mainWindow.webContents.send('storyboarder:get-board', uid))
ipcMain.on('shot-generator:get-board', (event, board) => {
  let win = shotGeneratorWindow.getWindow()
  if (win) {
    win.send('shot-generator:get-board', board)
  }
})
ipcMain.on('storyboarder:get-storyboarder-file-data',
  (event, uid) => mainWindow.webContents.send('storyboarder:get-storyboarder-file-data'))
ipcMain.on('shot-generator:get-storyboarder-file-data', (event, data) => {
  let win = shotGeneratorWindow.getWindow()
  if (win) {
    win.send('shot-generator:get-storyboarder-file-data', data)
  }
})
ipcMain.on('storyboarder:get-state',
  (event, uid) => mainWindow.webContents.send('storyboarder:get-state'))
ipcMain.on('shot-generator:get-state', (event, data) => {
  let win = shotGeneratorWindow.getWindow()
  if (win) {
    win.send('shot-generator:get-state', data)
  }
})
ipcMain.on('shot-generator:open', () => {
  // TODO analytics?
  // analytics.screenView('shot-generator')
  shotGeneratorWindow.show(win => {
    win.webContents.send('shot-generator:reload')
  })
})
ipcMain.on('shot-generator:update', (event, { board }) => {
  let win = shotGeneratorWindow.getWindow()
  if (win) {
    win.webContents.send('update', { board })
  }
})
ipcMain.on('shot-generator:loadBoardByUid', (event, uid) => {
  let win = shotGeneratorWindow.getWindow()
  if (win) {
    win.webContents.send('loadBoardByUid', uid)
  }
})
ipcMain.on('shot-generator:requestSaveShot', (event, uid) => {
  let win = shotGeneratorWindow.getWindow()
  if (win) {
    win.webContents.send('requestSaveShot', uid)
  }
})
ipcMain.on('shot-generator:requestInsertShot', (event, uid) => {
  let win = shotGeneratorWindow.getWindow()
  if (win) {
    win.webContents.send('requestInsertShot', uid)
  }
})

ipcMain.on('shot-generator:updateStore', (event, action) => {
  let win = shotGeneratorWindow.getWindow()
  if (win) {
    win.webContents.send('shot-generator:updateStore', action)
  }
})

createResponders('registration:open', event => registration.show())
