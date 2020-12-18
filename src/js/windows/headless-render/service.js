const { ipcRenderer } = electron = require('electron')

const service = {}

service.getStoryboarderFileData = () =>
  new Promise(resolve => {
    ipcRenderer.once('headless-render:get-storyboarder-file-data', (event, data) => {
      resolve(data)
    })
    ipcRenderer.send('storyboarder:get-storyboarder-file-data')
  })

service.getStoryboarderState = () =>
  new Promise(resolve => {
    ipcRenderer.once('headless-render:get-state', (event, data) => {
      resolve(data)
    })
    ipcRenderer.send('storyboarder:get-state')
  })

service.getBoards = () =>
  new Promise(resolve => {
    ipcRenderer.once('headless-render:get-boards', (event, { boards }) => {
      resolve(boards)
    })
    ipcRenderer.send('storyboarder:get-boards')
  })

service.getBoard = uid =>
  new Promise(resolve => {
    ipcRenderer.once('headless-render:get-board', (event, board) => {
      resolve(board)
    })
    ipcRenderer.send('storyboarder:get-board', uid)
  })

service.loadBoardByUid = async uid => {
  // ask main > Shot Generator > to call loadBoardByUid
  ipcRenderer.send('headless-render:loadBoardByUid', uid)
}


module.exports = service
