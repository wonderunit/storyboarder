// ELECTRON_DISABLE_SECURITY_WARNINGS=true npx electron test/views/thumbnail-renderer/main.js

const { app, BrowserWindow } = electron = require('electron')

app.on('ready', () => {
  let win = new BrowserWindow({
    show: false,
    width: 1052,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadURL(`file://${__dirname}/index.html`)

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('close', () => {
    win = null
  })
})
