const { BrowserWindow, ipcMain, app, dialog } = electron = require('electron')
const isDev = require('electron-is-dev')

const path = require('path')
const url = require('url')

let win
let hasRendered = false

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true

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
    minWidth: isDev ? undefined : 1200,
    minHeight: isDev ? undefined : 800,
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

  // via https://github.com/electron/electron/blob/master/docs/api/web-contents.md#event-will-prevent-unload
  //     https://github.com/electron/electron/pull/9331
  //
  // if beforeunload is telling us to prevent unload ...
  win.webContents.on('will-prevent-unload', event => {
    const choice = dialog.showMessageBox({
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm',
      message: 'Your scene is not saved. Are you sure you want to close Shot Generator?'
    })

    const leave = (choice === 0)

    if (leave) {
      // ignore the default behavior of preventing unload
      // ... which means we'll actually ... _allow_ unload :)
      event.preventDefault()
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

ipcMain.on('shot-generator:menu:view:fps-meter', (event, value) => {
  win && win.webContents.send('shot-generator:menu:view:fps-meter', value)
})

// are we testing locally?
// SHOT_GENERATOR_STANDALONE=true npx electron src/js/windows/shot-generator/main.js
if (process.env.SHOT_GENERATOR_STANDALONE) {
  console.log('testing locally!')
  app.on('ready', () => {
    show(win => {})
  })
}

module.exports = {
  show,
  getWindow: () => win
}
