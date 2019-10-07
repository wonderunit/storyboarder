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
    ipcRenderer.once('shot-generator:list-boards', (event, { boards }) => {
      resolve(boards)
    })
    ipcRenderer.send('storyboarder:list-boards')
  })

service.getBoard = uid =>
  new Promise(resolve => {
    ipcRenderer.once('shot-generator:get-board', (event, board) => {
      resolve(board)
    })
    ipcRenderer.send('storyboarder:get-board', uid)
  })

module.exports = service
