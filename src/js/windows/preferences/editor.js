const { remote, ipcRenderer } = require('electron')
const util = require('./js/utils')
const prefsModule = require('electron').remote.require('./prefs.js')

let prefs = prefsModule.getPrefs('prefs window')

const onChange = (name, event) => {
  let el = event.target
  if (el.type == 'checkbox') {
    prefsModule.set(name, el.checked)
  } else if (el.type == 'number') {
    prefsModule.set(name, el.value)
  }
  render()
}

const render = () => {
  for (let el of inputs) {
    if (el.type == 'checkbox') {
      el.checked = prefs[el.name]
    } else if (el.type == 'number') {
      el.value = prefs[el.name]

      // HACK notify when this pref changes
      if (el.name == 'defaultBoardTiming') {
        ipcRenderer.send('prefs:change', { defaultBoardTiming: el.value })
      }

    }
  }
}

let inputs = document.querySelectorAll('input[type="checkbox"], input[type="number"]')

// bind
for (let el of inputs) {
  el.addEventListener('change', onChange.bind(this, el.name))
}

window.ondragover = () => { return false }
window.ondragleave = () => { return false }
window.ondragend = () => { return false }
window.ondrop = () => { return false }

render()