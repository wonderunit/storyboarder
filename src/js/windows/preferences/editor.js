const { remote, ipcRenderer } = require('electron')
const path = require('path')

const util = require('./js/utils')
const prefsModule = require('electron').remote.require('./prefs')

let prefs,
    inputs,
    imgEditorEl,
    imgEditorInput

const onChange = (name, event) => {
  let el = event.target
  if (el.type == 'checkbox') {
    prefsModule.set(name, el.checked)
  } else if (el.type == 'number') {
    prefsModule.set(name, el.value)
  }
  render()
}

const onFilenameClick = event => {
  remote.dialog.showOpenDialog(
    { title: 'Select Image Editor Application' },
    filenames => {
      if (filenames) {
        prefsModule.set('absolutePathToImageEditor', filenames[0])
        render()
      } else {
        prefsModule.set('absolutePathToImageEditor', undefined)
        render()
      }
    }
  )
}

const render = () => {
  prefs = prefsModule.getPrefs('prefs window')

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

  imgEditorInput.value = prefs['absolutePathToImageEditor'] || ''

  imgEditorEl.innerHTML = imgEditorInput.value
    ? util.truncateMiddle(
        path.basename(imgEditorInput.value, path.extname(imgEditorInput.value)) + 
        path.extname(imgEditorInput.value))
    : '(default)'
}

const init = () => {
  prefs = prefsModule.getPrefs('prefs window')

  inputs = document.querySelectorAll('input[type="checkbox"], input[type="number"]')

  imgEditorEl = document.querySelector('#absolutePathToImageEditor_filename')
  imgEditorInput = document.querySelector('#absolutePathToImageEditor')

  // bind
  for (let el of inputs) {
    el.addEventListener('change', onChange.bind(this, el.name))
  }

  imgEditorEl.addEventListener('click', onFilenameClick.bind(this))

  window.ondragover = () => { return false }
  window.ondragleave = () => { return false }
  window.ondragend = () => { return false }
  window.ondrop = () => { return false }

  render()
}

init()
