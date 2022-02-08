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

/*
 serialize/deserialize state machine context to/from a prefs "memento" for storage in prefs
 remembers values which must persist across sessions
 ignores temporary values (e.g. `pages`, `pageToPreview`)
*/
const { pipe, clone, pick } = require('ramda')

// TODO
// list of all keys in context that should be stored in prefs
const allowlist = [
  'paperSizeKey',
  'orientation',

  // calculated -- TODO remove this? should always be calculated, not stored?
  'paperSize',

  'gridDim',
  'direction',

  'enableDialogue',
  'enableAction',
  'enableNotes',
  'enableShotNumber',
  'boardTimeDisplay',
  'boardTextSize',
  'boardBorderStyle',

  'header' // { ... }
]

// context -> prefs
const toPrefsMemento = pipe(clone, pick(allowlist))

// prefs -> context
// NOTE does not validate any input (e.g. trusts whatever prefs gives it)
const fromPrefsMemento = pipe(clone, pick(allowlist))

module.exports = {
  getTemporaryFilepath,
  getExportFilepath,
  toPrefsMemento,
  fromPrefsMemento
}
