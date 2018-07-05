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

// NOTE: order does not matter. e.g.: CommandOrControl+Alt == Alt+CommandOrControl
const findMatchingCommandsByKeys = (keymap, pressedKeys) => {
  if (!pressedKeys) return []
  
  // set of matching commands
  let matches = new Set()
  
  // for all the commands we know of
  for (let command in keymap) {
    let match = true
  
    // get the individual keys that make up the command
    let keys = keymap[command].split('+')
  
    // for each key in the command's combo
    for (let key of keys) {
      if (key === 'CommandOrControl') {
        // 'Control' and 'Meta' keys are considered a match for 'CommandOrControl'
        // but if neither are found, this is not a match
        if (!(pressedKeys.includes('Ctrl') || pressedKeys.includes('Meta'))) {
          match = false
          break
        }
      } else if (key === 'Plus') {
        // accept '=' or '+' for 'Plus'
        // but if neither found, this is not match
        if ( ! (pressedKeys.includes('=') || pressedKeys.includes('+')) ) {
          match = false
          break
        }

      } else if (!pressedKeys.includes(key)) {
        match = false
        break
      }
    }
  
    if (match) {
      matches.add(command)
    }  
  }
  return [...matches]
}

// HACK very convoluted :/
// determine if, given a match, we should also reset the combo
// see https://github.com/coosto/ShortcutJS/issues/20
const _comboShouldTriggerReset = (keymap, pressedKeys) => {
  if (!pressedKeys) return false
  
  // for all the commands we know of
  for (let command in keymap) {  
    // get the individual keys that make up the command
    let keys = keymap[command].split('+')
  
    // for each key in the command's combo
    for (let key of keys) {
      if (key === 'CommandOrControl') {
        // if the command requires Meta and the user is pressing Meta and at least one other key
        if (
          pressedKeys.includes('Meta') &&
          pressedKeys.length > 1
         ) {
          // then this is a candidate for reset
          return true
        }
      }
    }
  }
  return false
}

const createIsCommandPressed = store => {
  return (cmd, pressedKeys = null) => {
    let keymap = store.getState().entities.keymap

    let result = findMatchingCommandsByKeys(
      keymap,
      pressedKeys || pressed()
    ).includes(cmd)

    // TODO should this only clear the combo we just matched?
    // automatically clear matching combos containing Meta
    // see https://github.com/coosto/ShortcutJS/issues/20
    if (result && _comboShouldTriggerReset(keymap, pressedKeys || pressed())) {
      reset()
    }

    return result
  }
}

// HACK will only match for single, exact key:command mapping (not multiple keys)
// only used by STS Sidebar
const createIsEventMatchForCommand = store =>
  (event, cmd) => store.getState().entities.keymap[cmd] === normalizeKeyForEvent(event)

module.exports = {
  pressed,
  findMatchingCommandsByKeys,
  createIsCommandPressed,
  createIsEventMatchForCommand
}
