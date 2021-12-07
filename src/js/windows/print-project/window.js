const { ipcRenderer, remote } = require('electron')
const { interpret } = require('xstate')
const React = require('react')
const ReactDOM = require('react-dom')
const { mergeDeepRight } = require('ramda')

const prefs = remote.require('./prefs')

const { getProjectData } = require('./data')
const { machine: printProjectMachine } = require('./machine')
const { generateToCanvas, exportToFile, displayWarning, requestPrint } = require('./services')
const { reportAnalyticsEvent, showItemInFolder, persist } = require('./actions')
const { PrintApp } = require('./components')
const { fromMemento } = require('./memento')

const getData = () => ipcRenderer.invoke('exportPDF:getData')



const maybeReadContextFromPrefs = () => {
  let { printProjectState } = prefs.getPrefs()

  return printProjectState
    ? fromMemento(printProjectState)
    : undefined
}

const start = async () => {
  let project
  let canvas

  project = await getProjectData(await getData())

  // create canvas
  canvas = document.createElement('canvas')

  // system defaults
  let systemContext = printProjectMachine.context
  // user context overrides from prefs (if available)
  let userContext = maybeReadContextFromPrefs() || {}

  const service = interpret(
    printProjectMachine
      .withConfig({
        actions: {
          reportAnalyticsEvent,
          showItemInFolder,
          persist
        },
        services: {
          generateToCanvas,
          exportToFile,
          displayWarning,
          requestPrint 
        }
      })
      .withContext({
        ...mergeDeepRight(
          systemContext,
          userContext
        ),
        project,
        canvas
      })
  )
  .onTransition((state, event) => console.log(JSON.stringify(event) + ' ➤ ' + JSON.stringify(state.value)))
  .onDone(() => window.close())
  .start()

  ReactDOM.render(
    React.createElement(PrintApp, { service, canvas }),
    document.querySelector('.container')
  )

  document.addEventListener('keyup', event => {
    switch (event.key) {
      case 'ArrowLeft':
        service.send('DECREMENT_PAGE_TO_PREVIEW')
        break
      case 'ArrowRight':
        service.send('INCREMENT_PAGE_TO_PREVIEW')
        break
      case 'Escape':
        service.send('CLOSE')
        break
    }
  })
}
start()
