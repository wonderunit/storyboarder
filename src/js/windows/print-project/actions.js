const { ipcRenderer, shell } = require('electron')

const reportAnalyticsEvent = (context, event) => {
  if (event.type == 'done.invoke.exportToFile') {
    ipcRenderer.send('analyticsEvent', 'Board', 'exportPDF')
  }

}

const showItemInFolder = (context, event) =>
  shell.showItemInFolder(event.data.filepath)

module.exports = {
  reportAnalyticsEvent,
  showItemInFolder
}
