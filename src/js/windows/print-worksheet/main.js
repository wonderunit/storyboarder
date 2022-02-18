const remoteMain = require('@electron/remote/main')
const { BrowserWindow } = require('electron')
const path = require('path')

let win

const show = async ({ parent }) => {
  if (win) {
    win.reload()
    win.show()
    return
  }

  win = new BrowserWindow({
    parent,
    show: false,

    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 600,
    backgroundColor: '#333333',

    center: true,
    resizable: true,

    frame: false,
    modal: true,

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      contextIsolation: false
    }
  })
  remoteMain.enable(win.webContents)
  win.on('closed', () => (win = null))
  await win.loadFile(path.join(__dirname, 'index.html'))
  win.show()
}

module.exports = {
  show
}
