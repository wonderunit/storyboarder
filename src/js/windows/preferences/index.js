const { BrowserWindow } = electron = require('electron')

module.exports = () => {
  let win

  const show = () => {
    // TODO prevent multiple
    win = new BrowserWindow({
      width: 600,
      height: 580,
      show: false,
      center: true,
      resizable: false,
      backgroundColor: '#E5E5E5',
      webPreferences: {
        devTools: true
      }
    })
    win.loadURL(`file://${__dirname}/../../../preferences.html`)
    win.once('ready-to-show', () => {
      win.show()
    })
  }

  return {
    show
  }
}
