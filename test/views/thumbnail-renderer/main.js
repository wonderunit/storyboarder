const { app, BrowserWindow } = electron = require('electron')

app.on('ready', () => {
  let win = new BrowserWindow({
    show: false,
    width: 1052,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
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
