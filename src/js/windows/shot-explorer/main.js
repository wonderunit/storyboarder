const remote = require('@electron/remote')
const remoteMain = remote.require('@electron/remote/main')

const path = require('path')
const url = require('url')

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true

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
    //win.webContents.openDevTools()
    //onComplete(win)
  }

const createWindow = async ( onComplete, aspectRatio) => {
    if (win) {
      //reveal(onComplete)
      return
    }
    let { x, y, width, height } = memento
    win = new remote.BrowserWindow({
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
        contextIsolation: false
      },
    })
    remoteMain.enable(win.webContents)

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