// via https://raw.githubusercontent.com/hughsk/key-pressed/master/index.js
const keys = require('vkey')
const R = require('ramda')

const list = Object.keys(keys)

let down = {}
let ordered = new Set()

function pressed (key) {
  return key
    ? down[key]
    : down
}

function reset () {
  list.forEach(code => down[keys[code]] = false)
  ordered = new Set()
}

function keydown (e) {
  down[keys[e.keyCode]] = true
  ordered.add(keys[e.keyCode])
}

function keyup (e) {
  down[keys[e.keyCode]] = false
  ordered.delete(keys[e.keyCode])
}

const findMatching = (map, keys) =>
  R.reject(R.isNil, 
    R.flatten(R.props(keys, map)))

const isActive = (map, key, keys) => findMatching(map, keys).includes(key)

reset()
window.addEventListener('keydown', keydown, false)
window.addEventListener('keyup', keyup, false)
window.addEventListener('blur', reset, false)

module.exports = {
  pressed,
  isActive: (map, key) => isActive(map, key, [...ordered])
}
