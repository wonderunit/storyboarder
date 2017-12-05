const R = require('ramda')

let down = new Set()

function hasCombo (key, down) {
  let keys = key.split(/\+/)
  for (let k of keys) {
    if (k === 'CommandOrControl' || k === 'CmdOrCtrl') {
      return hasCombo(key.replace(k, 'Control'), down) ||
             hasCombo(key.replace(k, 'Meta'), down)
    }
    if (!down.has(k)) return false
  }
  return true
}

function pressed (key) {
  return key
    ? hasCombo(key, down)
    : [...down]
}

function reset () {
  down = new Set()
}

function keydown (e) {
  down.add(e.key)
}

function keyup (e) {
  down.delete(e.key)
}

function convertElectronAccelerators (list) {
  let accum = {}
  for (let k of Object.keys(list)) {

    let replaced = false
    for (let token of [/CommandOrControl/, /CmdOrCtrl/]) {
      if (k.match(token)) {
        accum[k.replace(token, 'Command')] = list[k]
        accum[k.replace(token, 'Control')] = list[k]
        replaced = true
      }
    }
    if (!replaced) accum[k] = list[k]

  }
  // TODO remove dupes?
  return accum
}

// TODO do we need this?
const keyIndexed = list => {
  let acc = []
  for (k of Object.keys(list)) {
    acc.push(
      [k.split('+').sort(), list[k]]
    )
  }
  return acc
}

// TODO should we keep a cache of active commands?
// TODO should we not invert the index?
const isActive = (invertedKeyMap, name) => {
  let matching = invertedKeyMap.filter(m => m[1].includes(name))
  for (l of matching) {
    let combo = l[0]
    let matchesAll = true
    for (let key of combo) {
      if (!down.has(key)) matchesAll = false
    }
    if (matchesAll) return true
  }
  return false
}

reset()
window.addEventListener('keydown', keydown, false)
window.addEventListener('keyup', keyup, false)
window.addEventListener('blur', reset, false)

module.exports = {
  pressed,
  isActive,
  convertElectronAccelerators,
  keyIndexed
}
