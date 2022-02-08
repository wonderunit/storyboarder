const { ipcRenderer, remote } = require('electron')
const { interpret } = require('xstate')
const React = require('react')
const ReactDOM = require('react-dom')
const { mergeDeepRight } = require('ramda')

const i18n = require('../../services/i18next.config')
const menu = require('../../menu')

const prefs = remote.require('./prefs')

const { getProjectData } = require('./data')
const { machine: printProjectMachine } = require('./machine')
const { generateToCanvas, exportToFile, displayWarning, requestPrint } = require('./services')
const { reportAnalyticsEvent, showItemInFolder, persist } = require('./actions')
const { PrintApp } = require('./components')

const { fromMemento } = require('./context-helpers')
const getData = () => ipcRenderer.invoke('exportPDF:getData')



const maybeReadContextFromPrefs = () => {
  let { printProjectState } = prefs.getPrefs()

  return printProjectState
    ? fromMemento(printProjectState)
    : undefined
}

// const logTransition = (state, event) =>
//   console.log(JSON.stringify(event) + ' ➤ ' + JSON.stringify(state.value))

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
  // .onTransition(logTransition)
  .onDone(() => {
    // when this modal closes, explicitly set the main-window menu again
    menu.setMenu(i18n)

    window.close()
  })
  .start()

  ReactDOM.render(
    React.createElement(PrintApp, { service, canvas }),
    document.querySelector('.container')
  )



  // quick hack to provide print-project with a custom menu
  //   so user keyboard input is not intercepted and sent to main-window unexpectedly
  //
  // i18n probably won't be initialized at this point, so if not ...
  if (!i18n.isInitialized) {
    // ... wait until it's initialized before calling setting the print-project menu
    i18n.on('initialized', event =>
      menu.setPrintProjectMenu(i18n))
  } else {
    // otherwise, set the print-project menu immediately
    menu.setPrintProjectMenu(i18n)
  }
  window.addEventListener('focus', (event) => {
    // because main-window holds this modal,
    //   main-window will try to set the menu first when re-focused
    //     so just wait until after that’s done lol
    setTimeout(() => {
      menu.setPrintProjectMenu(i18n)
    }, 10)
  })



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
