const { ipcRenderer, shell } = require('electron')

const showItemInFolder = (context, event) =>
  shell.showItemInFolder(event.data.filepath)

module.exports = {
  showItemInFolder
}
