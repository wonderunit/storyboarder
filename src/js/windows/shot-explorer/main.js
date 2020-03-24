const { BrowserWindow, ipcMain, app, dialog } = electron = require('electron').remote
const isDev = require('electron-is-dev')

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

let memento = {
  x: undefined,
  y: undefined,
  width: 1505,
  height: 1080
}

const reveal = () => {
    win.show()
    win.focus()
  //  win.webContents.openDevTools()
    //onComplete(win)
  }

const createWindow = async ( onComplete, aspectRatio) => {
    if (process.env.NODE_ENV === 'development') {
      await installExtensions()
    } else {
      removeExtensions()
    }
  
    if (win) {
      //reveal(onComplete)
      return
    }
    console.log((900 * aspectRatio) / 2)
    let { x, y, width, height } = memento
    win = new BrowserWindow({
     // minWidth: (500 * aspectRatio),
      //minHeight: 800,

     // maxWidth: (300 * aspectRatio),
      x,
      y,
      width,
      height,
  
      show: false,
      center: true,
      frame: true,
  
      backgroundColor: '#333333',
      titleBarStyle: 'hiddenInset',
  
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
    win.loadURL(url.format({
      pathname: path.join(__dirname, '..', 'shot-explorer.html'),
      protocol: 'file:',
      slashes: true
    }))
  
    // use this to wait until the window has completely loaded
    // ipcMain.on('shot-generator:window:loaded', () => { })
  
    // use this to show sooner
    win.once('ready-to-show', () => {
      onComplete()
    })
  }

module.exports = {
  createWindow,
  getWindow: () => win,
  reveal
}