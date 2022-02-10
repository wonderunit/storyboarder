const moment = require('moment')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const { memoizeWith, pipe, clone, pick, without } = require('ramda')

const createTempFilePath = () =>
  path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'storyboarder-')),
    'export.pdf'
  )

const getTemporaryFilepath = memoizeWith(String, createTempFilePath)

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
 Prefs Memento

 remembers partial context which must persist across sessions
 serialize/deserialize state machine context to/from a prefs "memento" for storage in prefs
 ignores temporary or calculated values (e.g. `pages`, `pageToPreview`)
*/

// list of all keys in context that should be stored in prefs
const prefsAllowlist = [
  'paperSizeKey',
  'orientation',

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
const toPrefsMemento = pipe(clone, pick(prefsAllowlist))

// prefs -> context
const fromPrefsMemento = pipe(clone, pick(prefsAllowlist))

/*
 * toPresetMemento
 * given a full state machine context, return the preset data
 */
const presetAllowlist = without(['paperSizeKey'], prefsAllowlist)
const toPresetMemento = pick(presetAllowlist)

module.exports = {
  getTemporaryFilepath,
  getExportFilepath,

  toPrefsMemento,
  fromPrefsMemento,

  toPresetMemento
}
