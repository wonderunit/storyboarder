//
// for reference:
//
// https://github.com/iffy/electron-updater-example/blob/master/main.js
// https://github.com/wulkano/kap/blob/b326a5a398affb3652650ddc70d3a95724e755db/app/src/main/auto-updater.js

const { dialog } = require('electron')

const autoUpdater = require('electron-updater').autoUpdater

const init = win => {
  autoUpdater.on('checking-for-update', () => {
    dialog.showMessageBox(null, { message: 'Checking for update...' })
  })
  autoUpdater.on('update-available', (ev, info) => {
    dialog.showMessageBox(null, { message: 'Update available.' })
  })
  autoUpdater.on('update-not-available', (ev, info) => {
    dialog.showMessageBox(null, { message: 'Update not available.' })
  })
  autoUpdater.on('error', (ev, err) => {
    dialog.showMessageBox(null, { message: 'Error in auto-updater.' })
  })
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')'
    dialog.showMessageBox(null, { message: log_message })
  })
  autoUpdater.on('update-downloaded', (ev, info) => {
    dialog.showMessageBox(null, { message: 'Update downloaded; will install in 5 seconds' })
  });
  autoUpdater.on('update-downloaded', (ev, info) => {
    // Wait 5 seconds, then quit and install
    // In your application, you don't need to wait 5 seconds.
    // You could call autoUpdater.quitAndInstall(); immediately
    setTimeout(function() {
      autoUpdater.quitAndInstall()
    }, 5000)
  })

  autoUpdater.checkForUpdates()
}

exports.init = init
