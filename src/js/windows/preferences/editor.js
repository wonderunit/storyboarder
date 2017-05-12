const { remote } = require('electron')
const prefsModule = require('electron').remote.require('./../js/prefs')

const util = require('./js/utils')

const sharedObj = remote.getGlobal('sharedObj')

const save = () => {
  sharedObj.prefs = prefs
  prefsModule.savePrefs(prefs)
}

const onChange = (name, event) => {
  prefs[name] = event.target.checked
  render()
  save()
}

const render = () => {
  for (let el of inputs) {
    el.checked = prefs[el.name]
  }
}

let prefs = util.stringifyClone(sharedObj.prefs)

let inputs = document.querySelectorAll('input[type="checkbox"]')

// bind
for (let el of inputs) {
  el.addEventListener('change', onChange.bind(this, el.name))
}

render()
