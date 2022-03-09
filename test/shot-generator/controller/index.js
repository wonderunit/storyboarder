const remoteMain = require('@electron/remote/main')
const electron = require('electron')
const { app } = require('electron')
const { BrowserWindow } = require('@electron/remote')

const isDev = require('electron-is-dev')

const path = require('path')
const url = require('url')

let mainWindow

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true

function createWindow () {
  console.log('new window', __dirname)
  mainWindow = new BrowserWindow({
    width: 500,
    height: 560,
    // x: 0,
    // y: 0,
    show: false,
    center: true,
    frame: true,
    titleBarStyle: 'default', //'hiddenInset',
    acceptFirstMouse: true,
    simpleFullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      plugins: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      backgroundThrottling: true,
      contextIsolation: false
    }
  })
  remoteMain.enable(mainWindow.webContents)
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  mainWindow.once('ready-to-show', () => {
    if (!isDev) autoUpdater.init()
    if (isDev) mainWindow.webContents.openDevTools()
    mainWindow.webContents.send('ready')
    mainWindow.show()
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  app.quit()
})
