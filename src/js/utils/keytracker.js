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

module.exports = pressed
