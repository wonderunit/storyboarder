const vkey = require('../utils/vkey')

let down = new Set()

function normalizeKeyForEvent (event) {
  return vkey[event.keyCode]
}

function pressed (key) {
  return key
    ? down.has(k)
    : [...down]
}

function reset () {
  down = new Set()
}

function keydown (e) {
  down.add(normalizeKeyForEvent(e))
}

function keyup (e) {
  if (normalizeKeyForEvent(e) === 'Meta') {
    // on OS X, keys pressed after the Meta key is held will not send a `keyup` 
    // see: https://github.com/electron/electron/issues/5188
    //      https://codepen.io/alexduloz/pen/nteqG
    // if you hold cmd, then press o, then release o, then release cmd, you get:
    // - keydown Meta
    // - keydown o
    // - keyup Meta
    // ... but you DO NOT get - keyup o
    // so if we get a Meta keyup, we're just clearing the Set entirely
    reset()

    // TODO we could pre-emptively remove any keys that had been after Meta
    //      ... this works for releasing meta+] but not ]+meta
    //      needs more testing
    //
    // let newDown = new Set()
    // for (let k of down) {
    //   newDown.add(k)
    //   if (k === 'Meta') {
    //     break
    //   }
    // }
    // down = newDown
  }
  down.delete(normalizeKeyForEvent(e))
}

reset()
window.addEventListener('keydown', keydown, false)
window.addEventListener('keyup', keyup, false)
window.addEventListener('blur', reset, false)
document.addEventListener('visibilitychange', reset, false)

// convert a key for easier matching
// e.g. 'Meta' and 'Control' become 'CommandOrControl'
const _normalizeMatchableKey = key => 
  key === 'Meta' || key === 'Control' ? 'CommandOrControl' : key

// NOTE: order does not matter. e.g.: CommandOrControl+Alt == Alt+CommandOrControl
const findMatchingCommandsByKeys = (keymap, pressedKeys) => {
  if (!pressedKeys) return []

  let normalizedPressedKeys = pressedKeys.map(_normalizeMatchableKey)

  let matches = new Set()
  for (let command of Object.keys(keymap)) {
    let keystroke = keymap[command].split('+')

    // matches non-normalized?
    let matchesPressed = true
    for (let k of keystroke) {
      if (!pressedKeys.includes(k))
        matchesPressed = false
    }
    if (matchesPressed)
      matches.add(command)

    // matches normalized?
    let matchesNormalized = true
    for (let k of keystroke) {
      if (!normalizedPressedKeys.includes(k))
        matchesNormalized = false
    }
    if (matchesNormalized)
      matches.add(command)
  }
  return [...matches]
}


const createIsCommandPressed = store =>
  cmd => findMatchingCommandsByKeys(
      store.getState().entities.keymap,
      pressed()
    ).includes(cmd)

module.exports = {
  pressed,
  findMatchingCommandsByKeys,
  createIsCommandPressed,
  normalizeKeyForEvent
}
