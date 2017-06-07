const { remote } = require('electron')
const util = require('./js/utils')
const prefsModule = require('electron').remote.require('./prefs.js')

let prefs = prefsModule.getPrefs('prefs window')

const onChange = (name, event) => {
  prefsModule.set(name, event.target.checked)
  render()
}

const render = () => {
  for (let el of inputs) {
    el.checked = prefs[el.name]
  }
}

let inputs = document.querySelectorAll('input[type="checkbox"]')

// bind
for (let el of inputs) {
  el.addEventListener('change', onChange.bind(this, el.name))
}

render()