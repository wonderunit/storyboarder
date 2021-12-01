const { ipcRenderer, shell, remote } = require('electron')

const prefs = remote.require('./prefs')
const { toMemento } = require('./memento')

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

const persist = (context, event) => {
  prefs.set('printProjectState', toMemento(context), true)
}

module.exports = {
  reportAnalyticsEvent,
  showItemInFolder,
  persist
}
