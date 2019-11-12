const { ipcRenderer } = electron = require('electron')

const service = {}

service.getStoryboarderFileData = () =>
  new Promise(resolve => {
    ipcRenderer.once('shot-generator:get-storyboarder-file-data', (event, data) => {
      resolve(data)
    })
    ipcRenderer.send('storyboarder:get-storyboarder-file-data')
  })

service.getStoryboarderState = () =>
  new Promise(resolve => {
    ipcRenderer.once('shot-generator:get-state', (event, data) => {
      resolve(data)
    })
    ipcRenderer.send('storyboarder:get-state')
  })

service.getBoards = () =>
  new Promise(resolve => {
    ipcRenderer.once('shot-generator:get-boards', (event, { boards }) => {
      resolve(boards)
    })
    ipcRenderer.send('storyboarder:get-boards')
  })

service.getBoard = uid =>
  new Promise(resolve => {
    ipcRenderer.once('shot-generator:get-board', (event, board) => {
      resolve(board)
    })
    ipcRenderer.send('storyboarder:get-board', uid)
  })

service.loadBoardByUid = async uid => {
  // ask main > Shot Generator > to call loadBoardByUid
  ipcRenderer.send('shot-generator:loadBoardByUid', uid)
}
service.saveShot = () =>
  new Promise(resolve => {
    ipcRenderer.on('update', (event, { board }) => {
      resolve({ board })
    })
    // ask main > Shot Generator > Storyboarder to save current board/sg to .storyboarder file
    ipcRenderer.send("shot-generator:requestSaveShot")
  })
service.insertShot = () =>
  new Promise(resolve => {
    ipcRenderer.on('update', (event, { board }) => {
      resolve({ board })
    })
    // ask main > Shot Generator > Storyboarder to insert current board/sg as new board
    ipcRenderer.send('shot-generator:requestInsertShot')
  })

module.exports = service
