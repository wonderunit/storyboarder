const { BrowserWindow } = electron = require('electron')

module.exports = () => {
  let win

  const show = () => {
    if (win) {
      win.focus()
      return
    }

    win = new BrowserWindow({
      width: 600,
      height: 720,
      show: false,
      center: true,
      resizable: false,
      backgroundColor: '#E5E5E5',
      webPreferences: {
        devTools: true,
        nodeIntegration: true
      }
    })
    win.once('closed', () => {
      win = null
    })
    win.loadURL(`file://${__dirname}/../../../preferences.html`)
    win.once('ready-to-show', () => {
      // wait for the DOM to render
      setTimeout(() => {
        win.show()
      }, 125)
    })
  }

  return {
    show
  }
}
