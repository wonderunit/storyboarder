const moment = require('moment')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const R = require('ramda')

const createTempFilePath = () =>
  path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'storyboarder-')),
    'export.pdf'
  )

const getTemporaryFilepath = R.memoizeWith(String, createTempFilePath)

const getExportFilename = (project, date) => {
  let base = project.scenes.length > 1
    ? path.parse(project.scriptFilepath).name
    : path.parse(project.scenes[0].storyboarderFilePath).name
  let datestamp = moment(date).format('YYYY-MM-DD hh.mm.ss')
  return filename = `${base} ${datestamp}.pdf`
}

const getExportFilepath = (context, event) =>
  path.join(
    context.project.root,
    'exports',
    getExportFilename(context.project, new Date()))

module.exports = {
  getTemporaryFilepath,
  getExportFilepath
}
