const moment = require('moment')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')

// memoized
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

const getExportFilename = (project, date) => {
  let base = project.scenes.length > 1
    ? path.parse(project.scriptFilepath).name
    : path.parse(project.scenes[0].storyboarderFilePath).name
  let datestamp = moment(date).format('YYYY-MM-DD hh.mm.ss')
  return filename = `${base} ${datestamp}.pdf`
}

const getTemporaryFilepath = createGetTempFilepath()

const getExportFilepath = (context, event) =>
  path.join(
    context.project.root,
    'exports',
    getExportFilename(context.project, new Date()))

module.exports = {
  getTemporaryFilepath,
  getExportFilepath
}
