const { remote } = require('electron')
const prefsModule = require('electron').remote.require('./../js/prefs')

const util = require('./js/utils')

const save = () => {
  remote.getGlobal('sharedObj').prefs = prefs
  prefsModule.savePrefs(prefs)
}

const onChange = (name, event) => {
  prefs[name] = event.target.checked
  render()
  save()
}

const render = () => {
  for (let el of [enableSoundEffectsEl, enableTooltipsEl, enableAspirationalMessagesEl]) {
    el.checked = prefs[el.name]
  }
}

let prefs = util.stringifyClone(remote.getGlobal('sharedObj').prefs)

let enableSoundEffectsEl = document.getElementById('enableSoundEffects')
let enableTooltipsEl = document.getElementById('enableTooltips')
let enableAspirationalMessagesEl = document.getElementById('enableAspirationalMessages')

// bind
for (let el of [enableSoundEffectsEl, enableTooltipsEl, enableAspirationalMessagesEl]) {
  el.addEventListener('change', onChange.bind(this, el.name))
}

render()
