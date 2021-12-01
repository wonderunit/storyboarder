/*
 serialize/deserialize state machine context to/from a prefs "memento" for storage in prefs
 remembers values which must persist across sessions
 ignores temporary values (e.g. `pages`, `pageToPreview`)
*/
const { pipe, clone, pick } = require('ramda')

// list of all keys in context that should be stored in prefs
const allowlist = [
  'paperSizeKey',
  'orientation',
  'paperSize',

  'gridDim',
  'direction',

  'enableDialogue',
  'enableAction',
  'enableNotes',
  'enableShotNumber',
  'boardTimeDisplay',
  'boardTextSize',

  'header' // { ... }
]

// context -> prefs
const toMemento = pipe(clone, pick(allowlist))

// prefs -> context
// NOTE does not validate any input (e.g. trusts whatever prefs gives it)
const fromMemento = pipe(clone, pick(allowlist))

module.exports = {
  toMemento,
  fromMemento
}

