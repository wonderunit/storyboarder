// REFERENCE
// https://github.com/iffy/electron-updater-example/blob/master/main.js
// https://github.com/wulkano/kap/blob/b326a5a398affb3652650ddc70d3a95724e755db/app/src/main/auto-updater.js

const { BrowserWindow, dialog, app } = electron = require('electron')

const autoUpdater = require('electron-updater').autoUpdater

const init = () => {
  // autoUpdater.on('checking-for-update', () => {
  //   dialog.showMessageBox(null, { message: 'Checking for update...' })
  // })
  autoUpdater.on('update-available', (ev, info) => {
    dialog.showMessageBox(
      null,
      {
        type: 'question',
        message: `An update is available to version ${ev.version}. Update now? There will be a short delay while we download the update and install it for you.`,
        buttons: ['Later', 'Download and Install Now']
      },
      index => {
        if (index) {
          // On Windows, this causes an error. Skipping for now.
          // BrowserWindow.getAllWindows().forEach(w => w.close())

          let win
          win = new BrowserWindow({
            width: 600,
            height: 720,
            show: false,
            center: true,
            resizable: false,
            backgroundColor: '#E5E5E5',
            webPreferences: {
              nodeIntegration: true,
              devTools: true
            }
          })
          win.on('closed', () => {
            win = null
          })
          win.loadURL(`file://${__dirname}/../update.html`)
          win.once('ready-to-show', () => {
            win.webContents.send('release-notes', ev.releaseNotes)
            win.show()
          })

          autoUpdater.on('download-progress', (progressObj) => {
            win.webContents.send('progress', progressObj)
          })

          autoUpdater.on('update-downloaded', (ev, info) => {
            dialog.showMessageBox(null, { message: 'Update downloaded; will install in 5 seconds' })
            // Wait 5 seconds, then quit and install
            // In your application, you don't need to wait 5 seconds.
            // You could call autoUpdater.quitAndInstall(); immediately
            setTimeout(function() {
              autoUpdater.quitAndInstall()
            }, 5000)
          })

          // fail gracelessly if we can't update properly
          autoUpdater.on('error', (err) => {
            console.error(err)
            dialog.showMessageBox(null, { message: 'Update failed. Quitting.\n' + err })
            win.close()
            app.quit()
          })

          // Download and Install
          autoUpdater.downloadUpdate()
        }
      }
    )
  })
  // autoUpdater.on('update-not-available', (ev, info) => {
  //   dialog.showMessageBox(null, { message: 'Update not available.' })
  // })
  autoUpdater.on('error', (err) => {
    console.error(err)
    // dialog.showMessageBox(null, { message: 'Error in auto-updater.\n' + err })
  })

  autoUpdater.autoDownload = false
  autoUpdater.checkForUpdates()
}

exports.init = init
