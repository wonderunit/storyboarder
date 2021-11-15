const fs = require('fs-extra')
const os = require('os')
const path = require('path')

const moment = require('moment')
const pdfjsLib = require('pdfjs-dist')
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../../../node_modules/pdfjs-dist/build/pdf.worker.js'

const generate = require('../../exporters/pdf')
const log = require('../../shared/storyboarder-electron-log')

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



//
//
// TODO store outpath in context?
//
// memoize tmp filepath
const createGetTempFilepath = function () {
  let filepath
  return function () {
    if (filepath) {
      return filepath
    } else {
      let directory = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboarder-'))
      filepath = path.join(directory, 'export.pdf')
      return filepath
    }
  }
}
const getTempFilepath = createGetTempFilepath()

const getExportFilename = (project, date) => {
  let base = project.scenes.length > 1
    ? path.parse(project.scriptFilepath).name
    : path.parse(project.scenes[0].storyboarderFilePath).name
  let datestamp = moment(date).format('YYYY-MM-DD hh.mm.ss')
  return filename = `${base} ${datestamp}.pdf`
}



const exportToFile = async (context, event) => {
  const { project } = context

  let filename = getExportFilename(project, new Date())
  let filepath = path.join(project.root, 'exports', filename)
  // ensure `exports` folder exists
  fs.mkdirpSync(path.dirname(filepath))

  let stream = fs.createWriteStream(filepath)
  await new Promise(async (resolve, reject) => {
    stream.on('error', reject)
    stream.on('finish', resolve)
    await generate(stream, { project }, getGeneratorConfig(context))
  })

  log.info('exported to ' + filepath)

  return { filepath }
}

const generateToCanvas = async (context, event) => {
  let { project, canvas } = context

  let cfg = {
    ...context,
    pages: [context.pageToPreview, context.pageToPreview]
  }

  canvas.parentNode.parentNode.classList.add('busy--generating')

  // create and save the file
  let outfile = getTempFilepath()
  let stream = fs.createWriteStream(outfile)
  log.info('generating temporary pdf to', outfile)
  await new Promise(async (resolve, reject) => {
    stream.on('error', reject)
    stream.on('finish', resolve)
    await generate(stream, { project }, getGeneratorConfig(cfg))
  })

  // load and render the file to the canvas
  log.info('displaying pdf')
  let task = pdfjsLib.getDocument(outfile)
  let pdf = await task.promise
  let page = await pdf.getPage(1)

  let full = page.getViewport({ scale: 1 })

  // fit to the space available within the output element, minus its padding
  let outputEl = canvas.parentNode.parentNode
  let available = outputEl.getBoundingClientRect()
  let styles = getComputedStyle(outputEl)
  let w = parseInt(styles.paddingLeft) + parseInt(styles.paddingRight)
  let h = parseInt(styles.paddingTop) + parseInt(styles.paddingBottom)
  available.width -= w
  available.height -= h
  let [width, height] = fit([full.width, full.height], [available.width, available.height])

  let scale = Math.min((width / full.width), (height / full.height))

  let viewport = page.getViewport({ scale: scale * window.devicePixelRatio })
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = px(viewport.width / window.devicePixelRatio)
  canvas.style.height = px(viewport.height / window.devicePixelRatio)

  // lol
  canvas.parentNode.style.transform = 'rotate3d(1, 0, 1, ' + ((Math.random() * 4)-2) + 'deg)'

  let ctx = canvas.getContext('2d')
  let renderContext = {
    canvasContext: ctx,
    viewport: viewport
  }
  let renderTask = page.render(renderContext)
  await renderTask.promise

  log.info('write complete')

  canvas.parentNode.parentNode.classList.remove('busy--generating')
}

const displayWarning = async (context, event) => {
  log.warn(event.data)
  alert(event.data)
}

module.exports = {
  generateToCanvas,
  exportToFile,
  displayWarning
}
