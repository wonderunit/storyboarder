const { BrowserWindow, ipcMain, app } = electron = require('electron')

const path = require('path')
const url = require('url')

let win
let hasRendered = false

const reveal = (onComplete) => {
  if (hasRendered) {
    win.show()
    win.focus()
    onComplete(win)
  } else {
    hasRendered = true
    // wait for the DOM to render
    setTimeout(() => {

      win.show()
      win.focus()
      onComplete(win)
    }, 125)
  }
}

const show = (onComplete) => {
  if (win) {
    reveal(onComplete)
    return
  }

  win = new BrowserWindow({
    width: 1500,
    height: 1080,
    minWidth: 1200,
    minHeight: 800,
    // x: 0,
    // y: 0,
    show: false,
    center: true,
    frame: true,

    backgroundColor: '#333333',
    titleBarStyle: 'hiddenInset',

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
    reveal(onComplete)
  })
}

module.exports = {
  show
}

// are we testing locally?
// SHOT_GENERATOR_STANDALONE=true npx electron src/js/windows/shot-generator/main.js
if (process.env.SHOT_GENERATOR_STANDALONE) {
  console.log('testing locally!')
  app.on('ready', () => {
    show(win => {})
  })
}
