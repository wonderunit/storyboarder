const remoteMain = require('@electron/remote/main')
const { BrowserWindow } = require('electron')

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
    width: 600,
    height: 720,
    minWidth: 600,
    minHeight: 720,
    show: false,
    center: true,
    resizable: false,
    backgroundColor: '#E5E5E5',
    frame: true,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      devTools: true,
      contextIsolation: false
    }
  })
  remoteMain.enable(win.webContents)
  win.once('closed', () => {
    win = null
  })
  win.loadURL(`file://${__dirname}/../../../registration.html`)
  win.once('ready-to-show', () => {
    reveal()
  })
}

module.exports = {
  show
}
