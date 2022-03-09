const fs = require('fs-extra')
const path = require('path')
const { pipeline } = require('stream/promises')

const pdfjsLib = require('pdfjs-dist')
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../../../node_modules/pdfjs-dist/build/pdf.worker.js'

const generate = require('../../exporters/pdf')
const log = require('../../shared/storyboarder-electron-log')

const remote = require('@electron/remote')
const createPrint = require('../../print')
const print = createPrint({
  pathToSumatraExecutable: path.join(remote.app.getAppPath(), 'src', 'data', 'app', 'SumatraPDF.exe')
})

const omit = (original = {}, keys = []) => {
  const clone = { ...original }
  for (const key of keys) {
    delete clone[key]
  }
  return clone
}

// convert context to generator config object
const getGeneratorConfig = context =>
  omit(context, ['paperSizeKey', 'orientation'])

const px = n => `${n}px`

// via https://stackoverflow.com/questions/6565703
const fit = ([wi, hi], [ws, hs]) =>
  ws / hs > wi / hi
    ? [wi * hs / hi, hs]
    : [ws, hi * ws / wi]

const exportToFile = async (context, event) => {
  const { project, filepath } = context

  // ensure directory exists
  fs.mkdirpSync(path.dirname(filepath))

  await pipeline(
    generate({ project }, getGeneratorConfig(context)),
    fs.createWriteStream(filepath)
  )
}

const generateToCanvas = async (context, event) => {
  let { canvas: oldCanvas } = context
  let parentNode = oldCanvas.parentNode
  let outputEl = parentNode.parentNode

  await exportToFile(
    {
      ...context,

      // override `pages` to force a single-page preview
      pages: [context.pageToPreview, context.pageToPreview]
    },
    event
  )

  // load and render the file to the canvas
  let task = pdfjsLib.getDocument(context.filepath)
  let pdf = await task.promise
  let page = await pdf.getPage(1)

  let full = page.getViewport({ scale: 1 })

  // fit to the space available within the output element, minus its padding
  let available = outputEl.getBoundingClientRect()
  let styles = getComputedStyle(outputEl)
  let w = parseInt(styles.paddingLeft) + parseInt(styles.paddingRight)
  let h = parseInt(styles.paddingTop) + parseInt(styles.paddingBottom)
  available.width -= w
  available.height -= h
  let [width, height] = fit([full.width, full.height], [available.width, available.height])

  let scale = Math.min((width / full.width), (height / full.height))
  let viewport = page.getViewport({ scale: scale * window.devicePixelRatio })

  // create the new canvas
  let newCanvas = document.createElement('canvas')
  newCanvas.width = viewport.width
  newCanvas.height = viewport.height
  newCanvas.style.width = px(viewport.width / window.devicePixelRatio)
  newCanvas.style.height = px(viewport.height / window.devicePixelRatio)
  let renderTask = page.render({
    canvasContext: newCanvas.getContext('2d'),
    viewport: viewport
  })
  // TODO could allow user to cancel, via `renderTask.cancel()`
  await renderTask.promise

  return newCanvas
}

const displayWarning = async (context, event) => {
  log.warn(event.data)
  alert(event.data)
}

const requestPrint = async (context, event) => {
  await exportToFile(context, event)

  // a4, letter
  let paperSize = context.paperSizeKey

  // landscape, portrait
  let paperOrientation = context.orientation

  // TODO hardcoded # of copies
  let copies = 1

  // TODO `print` could be its own service if context included `copies`
  print({
    filepath: context.filepath,
    paperSize,
    paperOrientation,
    copies
  })

  fs.rmSync(context.filepath)
}

module.exports = {
  generateToCanvas,
  exportToFile,
  displayWarning,
  requestPrint
}
