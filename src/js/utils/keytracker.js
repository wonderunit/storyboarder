// via https://raw.githubusercontent.com/hughsk/key-pressed/master/index.js
var keys = require('vkey')
var list = Object.keys(keys)
var down = {}

reset()

window.addEventListener('keydown', keydown, false)
window.addEventListener('keyup', keyup, false)
window.addEventListener('blur', reset, false)

function pressed(key) {
  return key
    ? down[key]
    : down
}

function reset() {
  list.forEach(function(code) {
    down[keys[code]] = false
  })
}

function keyup(e) {
  down[keys[e.keyCode]] = false
}

function keydown(e) {
  down[keys[e.keyCode]] = true
}

const findMatching = (map, keys) =>
  R.reject(R.isNil, 
    R.flatten(R.props(keys, map)))

const isActive = (map, key, keys) => findMatching(map, keys).includes(key)

module.exports = {
  pressed,
  isActive: (map, key) => isActive(map, key, down)
}
