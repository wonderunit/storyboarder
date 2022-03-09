const { ipcRenderer } = require('electron')
const remote = require('@electron/remote')
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
const {
  reportAnalyticsEvent,
  showItemInFolder,
  persist,
  hidePreviewDisplay,
  showPreviewDisplay
} = require('./actions')
const { PrintApp } = require('./components')
const { fromPrefsMemento } = require('./context-helpers')
const getPresets = require('./presets')

const getData = () => ipcRenderer.invoke('exportPDF:getData')



const maybeReadContextFromPrefs = () => {
  let { printProjectState } = prefs.getPrefs()

  return printProjectState
    ? fromPrefsMemento(printProjectState)
    : undefined
}

// const logTransition = (state, event) =>
//   console.log(JSON.stringify(event) + ' ➤ ' + JSON.stringify(state.value))

const start = async () => {
  let project
  let canvas
  let presets = getPresets(i18n.t.bind(i18n))

  project = await getProjectData(await getData())

  // create canvas
  canvas = document.createElement('canvas')

  // system defaults
  let systemContext = {
    ...printProjectMachine.context,
    // include data from first system preset by default for first run
    ...Object.entries(presets)[0][1].data
  }
  
  // user context overrides from prefs (if available)
  let userContext = maybeReadContextFromPrefs() || {}

  const service = interpret(
    printProjectMachine
      .withConfig({
        actions: {
          reportAnalyticsEvent,
          showItemInFolder,
          persist,
          hidePreviewDisplay,
          showPreviewDisplay
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
        canvas,
        presets
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
  // set the print-project menu immediately
  menu.setPrintProjectMenu(i18n)
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
        if (event.target == document.body) service.send('DECREMENT_PAGE_TO_PREVIEW')
        break
      case 'ArrowRight':
        if (event.target == document.body) service.send('INCREMENT_PAGE_TO_PREVIEW')
        break
      case 'Escape':
        if (event.target == document.body) {
          service.send('CLOSE')
        } else {
          event.target.blur && event.target.blur()
        }
        break
    }
  })
}

i18n.on('initialized', event => start())
