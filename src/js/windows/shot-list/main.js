// ELECTRON_DISABLE_SECURITY_WARNINGS=true npx electron src/js/windows/shot-list/main.js

const { app, BrowserWindow } = electron = require('electron')

app.on('ready', () => {
  let win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadURL(`file://${__dirname}/shot-list.html`)

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('close', () => {
    win = null
  })
})
