const EventEmitter = require('events').EventEmitter
const prefModule = require('@electron/remote').require('./prefs')

let emitter = new EventEmitter()

let selectEl
let validOptions

let model = {
  fps: undefined,
  present (data) {
    if (data.fps) {
      model.fps = parseFloat(data.fps)
      emitter.emit('fps', model.fps)
      // persist
      prefModule.set('lastUsedFps', model.fps)
    }
    render()
  }
}

const init = settings => {
  selectEl = document.querySelector('.sidebar-scene-settings_fps')
  model.present({ fps: settings.fps })

  selectEl.addEventListener('change', onChange)
}

const onChange = event => {
  event.preventDefault()
  model.present({ fps: event.target.value })
}

const render = () => {
  selectEl.value = model.fps.toString()
}

module.exports = Object.assign(emitter, {
  init
})
