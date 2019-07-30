// SHOT_GENERATOR_STANDALONE=true npx electron src/js/windows/shot-generator/standalone.js

const { app } = electron = require('electron')
const log = require('electron-log')

// point to 'Storyboarder' instead of 'Electron'
// to fix getPath('userData') calls
// const app = electron.app ? electron.app : electron.remote.app
log.info('[SHOT_GENERATOR_STANDALONE]: setting app paths to Storyboarder')
const path = require('path')
app.setName('Storyboarder')
let pkg = path.join(__dirname, '..', '..', 'package.json')
app._setDefaultAppPaths(pkg)

require('../../main')
const shotGeneratorMain = require('./main')

app.on('ready', () => {
  log.info('[SHOT_GENERATOR_STANDALONE]: loading shot from shot-generator.storyboarder')

  const fs = require('fs')
  const path = require('path')

  let storyboarderFilePath = path.join(
    __dirname, '..', '..', '..', '..',
    'test', 'fixtures', 'shot-generator', 'shot-generator.storyboarder'
  )

  let boardData = JSON.parse(fs.readFileSync(storyboarderFilePath))
  let board = boardData.boards[0]

  shotGeneratorMain.show(win => {
    win.webContents.send('loadBoard', {
      storyboarderFilePath,
      boardData,
      board
    })
  })

  // xrServer = new XRServer({ store })
})
