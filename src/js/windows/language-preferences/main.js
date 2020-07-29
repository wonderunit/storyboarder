const {BrowserWindow} = electron = require('electron')
const log = require('electron-log')
const path = require('path')
const url = require('url')

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true
//const { default: installExtension, REACT_DEVELOPER_TOOLS, REACT_PERF, REDUX_DEVTOOLS } = require('electron-devtools-installer')
const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];
  
  return Promise.all(
      extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

// Removes any extension from the production version
const removeExtensions = () => {
  const installed = BrowserWindow.getDevToolsExtensions()

  for (let extension of Object.keys(installed)) {
    BrowserWindow.removeDevToolsExtension(extension)
  }
}

let win
let loaded = false

let memento = {
  x: undefined,
  y: undefined,
  width: 1505,
  height: 1080
}

const reveal = () => {
    win.show()
    win.focus()
    win.webContents.openDevTools()
    //onComplete(win)
  }

const createWindow = async ( onComplete) => {
    if (process.env.NODE_ENV === 'development') {
      await installExtensions()
    } else {
      removeExtensions()
    }
  
    if (win) {
      //reveal(onComplete)
      return
    }
    let { x, y } = memento
    win = new BrowserWindow({
      x,
      y,
      width: 1200,
      height: 800,
      minWidth: 600,
      minHeight: 600,
  
      show: false,
      center: true,
      frame: true,
  
      backgroundColor: '#333333',
      titleBarStyle: 'hiddenInset',
      title: "Shot Explorer",
      acceptFirstMouse: true,
      simpleFullscreen: true,
      webPreferences: {
        nodeIntegration: true,
        plugins: true,
        webSecurity: false,
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
        backgroundThrottling: true,
        backgroundThrottling: true
      },
    })
  
    win.on('resize', () => memento = win.getBounds())
    win.on('move', () => memento = win.getBounds())
    win.webContents.on('will-prevent-unload', event => {
      event.preventDefault()
      win.hide()
    })

    win.once('closed', () => {
      win = null
    })
    log.info(path.join(__dirname, '..', '..', '..', 'language-preferences'))
    win.loadURL(url.format({
      pathname: path.join(__dirname, '..', '..', '..', 'language-preferences.html'),
      protocol: 'file:',
      slashes: true
    }))
  
    // use this to wait until the window has completely loaded
    //ipcMain.on('shot-generator:window:loaded', () => {  })
  
    // use this to show sooner
    win.once('ready-to-show', () => {
      onComplete()
      loaded = true
    })
  }

module.exports = {
  createWindow,
  getWindow: () => win,
  reveal,
  isLoaded: () => loaded
}