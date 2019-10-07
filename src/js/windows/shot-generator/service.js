const { ipcRenderer } = electron = require('electron')

const service = {}

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
