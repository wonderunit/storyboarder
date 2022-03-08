const { ipcRenderer, shell } = require('electron')
const remote = require('@electron/remote')

const prefs = remote.require('./prefs')
const { toPrefsMemento } = require('./context-helpers')

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
  prefs.set('printProjectState', toPrefsMemento(context), true)
}

const hidePreviewDisplay = (context, event) => {
  context.canvas.parentNode.style.visibility = 'hidden'
}

const showPreviewDisplay = (context, event) => {
  context.canvas.parentNode.style.visibility = 'visible'
}

module.exports = {
  reportAnalyticsEvent,
  showItemInFolder,
  persist,
  hidePreviewDisplay,
  showPreviewDisplay
}
