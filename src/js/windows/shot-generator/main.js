const { BrowserWindow, ipcMain, app, dialog } = electron = require('electron')
const isDev = require('electron-is-dev')

const path = require('path')
const url = require('url')
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true

//const { default: installExtension, REACT_DEVELOPER_TOOLS, REACT_PERF, REDUX_DEVTOOLS } = require('electron-devtools-installer')
const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];
  
  return Promise.all(
      extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

// Removes any extension from the production version
const removeExtensions = () => {
  const installed = BrowserWindow.getDevToolsExtensions()

  for (let extension of Object.keys(installed)) {
    BrowserWindow.removeDevToolsExtension(extension)
  }
}

let win
let memento = {
  x: undefined,
  y: undefined,
  width: 1505,
  height: 1080,
}

const reveal = onComplete => {
  win.show()
  win.focus()
  onComplete(win)
}

const show = async (onComplete) => {
  if (process.env.NODE_ENV === 'development') {
    await installExtensions()
  } else {
    removeExtensions()
  }

  if (win) {
    reveal(onComplete)
    return
  }

  let { x, y, width, height } = memento
  win = new BrowserWindow({
    minWidth: isDev ? undefined : 1200,
    minHeight: isDev ? undefined : 800,

    x,
    y,
    width,
    height,

    show: false,
    center: true,
    frame: true,

    backgroundColor: '#333333',
    titleBarStyle: 'hiddenInset',

    acceptFirstMouse: true,
    simpleFullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      plugins: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      backgroundThrottling: true,
    }
  })


  // via https://github.com/electron/electron/blob/master/docs/api/web-contents.md#event-will-prevent-unload
  //     https://github.com/electron/electron/pull/9331
  //
  // if beforeunload is telling us to prevent unload ...
  win.webContents.on('will-prevent-unload', event => {
    const choice = dialog.showMessageBox({
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm',
      message: 'Your scene is not saved. Are you sure you want to close Shot Generator?'
    })

    const leave = (choice === 0)

    if (leave) {
      // ignore the default behavior of preventing unload
      // ... which means we'll actually ... _allow_ unload :)
      event.preventDefault()
    }
  })

  win.on('resize', () => memento = win.getBounds())
  win.on('move', () => memento = win.getBounds())

  win.once('closed', () => {
    win = null
  })
  win.loadURL(url.format({
    pathname: path.join(__dirname, '..', '..', '..', 'shot-generator.html'),
    protocol: 'file:',
    slashes: true
  }))

  // use this to wait until the window has completely loaded
  // ipcMain.on('shot-generator:window:loaded', () => { })

  // use this to show sooner
  win.once('ready-to-show', () => {
    reveal(onComplete)
  })
}
ipcMain.on('shot-generator:menu:view:fps-meter', (event, value) => {
  win && win.webContents.send('shot-generator:menu:view:fps-meter', value)
})

ipcMain.on('shot-generator:menu:view:zoom', (event, value) => {
  win && win.webContents.send('shot-generator:menu:view:zoom', value)
})
ipcMain.on('shot-generator:menu:view:resetZoom', (event, value) => {
  win && win.webContents.send('shot-generator:menu:view:setZoom', value)
})

ipcMain.on('shot-generator:object:duplicate', () => {
  win.webContents.send('shot-generator:object:duplicate')
})

ipcMain.on('shot-generator:object:group', () => {
  win.webContents.send('shot-generator:object:group')
})

ipcMain.on('shot-generator:object:drops', () => {
  win.webContents.send('shot-generator:object:drop')
})

ipcMain.on('shot-generator:edit:undo', () => {
  win.webContents.send('shot-generator:edit:undo')
})
ipcMain.on('shot-generator:edit:redo', () => {
  win.webContents.send('shot-generator:edit:redo')
})

ipcMain.on('shot-generator:open:shot-explorer', () => {
  win.webContents.send('shot-generator:open:shot-explorer')
})

ipcMain.on('shot-generator:show:shot-explorer', () => {
  win.webContents.send('shot-generator:show:shot-explorer')
})

ipcMain.on('shot-generator:export-gltf', () =>
  win.webContents.send('shot-generator:export-gltf'))

module.exports = {
  show,
  getWindow: () => win
}
