const remoteMain = require('@electron/remote/main')
const { BrowserWindow } = electron = require('electron')

const path = require('path')
const url = require('url')

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true

let win

const reveal = onComplete => {
  win.show()
  win.focus()
  onComplete(win)
}

const show = (onComplete) => {
  if (win) {
    reveal(onComplete)
    return
  }

  win = new BrowserWindow({
    width: 1024,
    height: 768,

    show: false,
    center: true,
    frame: true,

    backgroundColor: '#333333',
    // titleBarStyle: 'hiddenInset',

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
    }
  })
  remoteMain.enable(win.webContents)

  win.once('closed', () => {
    win = null
  })

  win.once('ready-to-show', () => {
    reveal(onComplete)
  })

  win.loadURL(url.format({
    pathname: path.join(__dirname, '..', '..', '..', 'shot-generator-tutorial.html'),
    protocol: 'file:',
    slashes: true
  }))
}

module.exports = {
  show
}
