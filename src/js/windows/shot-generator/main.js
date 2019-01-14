const { BrowserWindow, ipcMain, app } = electron = require('electron')

const path = require('path')
const url = require('url')

let win
let hasRendered = false

const reveal = () => {
  if (hasRendered) {
    win.show()
    win.focus()
  } else {
    hasRendered = true
    // wait for the DOM to render
    setTimeout(() => {
      win.show()
      win.focus()
    }, 125)
  }
}

const show = () => {
  if (win) {
    reveal()
    return
  }

  win = new BrowserWindow({
    width: 1500, 
    height: 900, 
    minWidth: 1200, 
    minHeight: 715, 
    // x: 0,
    // y: 0,
    show: false,
    center: true,
    frame: true,
    titleBarStyle: 'default', //'hiddenInset',
    acceptFirstMouse: true,
    simpleFullscreen: true,
    webPreferences: {
      plugins: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      backgroundThrottling: true,
    }
  })
  win.once('closed', () => {
    win = null
  })
  win.loadURL(url.format({
    pathname: path.join(__dirname, '..', '..', '..', 'shot-generator.html'),
    protocol: 'file:',
    slashes: true
  }))
  win.once('ready-to-show', () => {
    reveal()
  })
}

module.exports = {
  show
}

// are we testing locally?
// npx electron src/js/windows/shot-generator/main.js
if (module.parent.filename === path.join(__dirname, '..', '..', '..', '..', 'node_modules/electron/dist/Electron.app/Contents/Resources/default_app.asar/main.js')) {
  app.on('ready', show)
}
