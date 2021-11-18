const { ipcRenderer, shell } = require('electron')

const reportAnalyticsEvent = (context, event) => {
  if (event.type == 'done.invoke.exportToFile') {
    ipcRenderer.send('analyticsEvent', 'Board', 'exportPDF')
  }

  // NOTE number of copies is not user-editable yet, so for now we always report it as 1
  if (event.type == 'done.invoke.requestPrint') {
    ipcRenderer.send('analyticsEvent', 'Board', 'print', null, 1)
  }
}

const showItemInFolder = (context, event) =>
  shell.showItemInFolder(context.filepath)

module.exports = {
  reportAnalyticsEvent,
  showItemInFolder
}
