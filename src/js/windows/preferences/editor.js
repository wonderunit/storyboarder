const { remote, ipcRenderer, shell } = require('electron')
const jwt = require('jsonwebtoken')
const path = require('path')
const fs = require('fs-extra')

const util = require('./js/utils')
const prefsModule = require('electron').remote.require('./prefs')

const { getInitialStateRenderer } = require('electron-redux')
const configureStore = require('./js/shared/store/configureStore')
const store = configureStore(getInitialStateRenderer(), 'renderer')

let prefs,
    inputs,
    imgEditorEl,
    imgEditorInput,
    revealKeyMapFileEl

let hasChanged
let originalPrefs

const onChange = (name, event) => {
  let el = event.target

  if (name === 'defaultBoardTiming') {
    if (el.value === '') {
      prefsModule.set(name, 2000, true)
    } else {
      prefsModule.set(name, el.value, true)
    }
  } else if (el.type == 'checkbox') {
    prefsModule.set(name, el.checked, true)
  } else if (el.type == 'number') {
    prefsModule.set(name, el.value, true)
  } else if (el.type == 'range') {
    prefsModule.set(name, parseInt(el.value, 10), true)
  }
  render()
}

const onInput = (name, event) => {
  let el = event.target

  if (el.type == 'range') {
    prefsModule.set(name, parseInt(el.value, 10), true)
  }
  render()
}

const onFilenameClick = event => {
  event.target.style.pointerEvents = 'none'
  remote.dialog.showOpenDialog(
    { title: 'Select Image Editor Application' },
    filenames => {
      event.target.style.pointerEvents = 'auto'
      if (filenames) {
        prefsModule.set('absolutePathToImageEditor', filenames[0], true)
        render()
      } else {
        prefsModule.set('absolutePathToImageEditor', undefined, true)
        render()
      }
    }
  )
}

const onWatermarkFileClick = event => {
  event.target.style.pointerEvents = 'none'
  remote.dialog.showOpenDialog(
    {
      title: 'Import Watermark Image File',
      properties: ['openFile'],
      filters: [
        {
          name: 'Watermark Image (PNG)',
          extensions: [
            'png'
          ]
        }
      ]
    },
    filenames => {
      event.target.style.pointerEvents = 'auto'
      if (filenames) {
        try {
          fs.copySync(filenames[0], path.join(remote.app.getPath('userData'), 'watermark.png'))
          prefsModule.set('userWatermark', path.basename(filenames[0]), true)
        } catch (err) {
          console.error(err)
          alert(err)
        }
        render()
      } else {
        prefsModule.set('userWatermark', undefined, true)
        render()
      }
    }
  )
}

const onRevealKeyMapFileClick = event => {
  event.preventDefault()
  let keymapPath = path.join(remote.app.getPath('userData'), 'keymap.json')
  shell.showItemInFolder(keymapPath)
}

const onSignOut = event => {
  event.preventDefault()
  prefsModule.set('auth', undefined)
  render()
}

const render = () => {
  prefs = prefsModule.getPrefs('prefs window')

  for (let el of inputs) {
    if (el.type == 'checkbox') {
      el.checked = prefs[el.name]
    } else if (el.type == 'number') {
      el.value = prefs[el.name]
    } else if (el.type == 'range') {
      el.value = prefs[el.name]
    }
  }

  imgEditorInput.value = prefs['absolutePathToImageEditor'] || ''

  imgEditorEl.innerHTML = imgEditorInput.value
    ? util.truncateMiddle(
        path.basename(imgEditorInput.value, path.extname(imgEditorInput.value)) + 
        path.extname(imgEditorInput.value))
    : '(default)'

  const storyboardersAccountEl = document.getElementById('storyboardersAccount')
  if (prefs.auth) {
    let auth = jwt.decode(prefs.auth.token)
    storyboardersAccountEl.style.display = 'flex'
    storyboardersAccountEl.querySelector('.preferences-hint').innerHTML = 
      `Signed In to Storyboarders.com (${auth.user.email})`
  } else {
    storyboardersAccountEl.style.display = 'none'
    storyboardersAccountEl.querySelector('.preferences-hint').innerHTML = ''
  }

  for (let el of document.querySelectorAll('input[type="range"]')) {
    let outEl = document.querySelector(`span[data-value="${el.id}"]`)

    if (el.value < 10) el.value = 0

    outEl.textContent = el.value >= 10
      ? el.value + ' msecs'
      : 'disabled'
  }

  let licensedEl = document.querySelector('#licensed-container')
  if (licensedEl) {
    let watermarkLabelEl = document.querySelector('#watermarkFile_filename')
    if (watermarkLabelEl) {
      watermarkLabelEl.innerHTML = prefs.userWatermark && fs.existsSync(path.join(remote.app.getPath('userData'), 'watermark.png'))
        ? prefs.userWatermark
        : '(default)'
    }
  }

  // track if anything has changed
  hasChanged = false
  for (let key in originalPrefs) {
    if (
      originalPrefs[key].constructor === Object ||
      originalPrefs[key].constructor === Array
    ) continue

    if (originalPrefs[key] !== prefs[key]) {
      hasChanged = true
      break
    }
  }
}

const init = () => {
  hasChanged = false
  originalPrefs = util.stringifyClone(prefsModule.getPrefs())

  prefs = prefsModule.getPrefs('prefs window')

  if (store.getState().license.iss) {
    let t = document.querySelector('#licensed-template')
    let clone = document.importNode(t.content, true)
    document.querySelector('#licensed-container').appendChild(clone)

    document.querySelector('#watermarkFile_filename').addEventListener('click', onWatermarkFileClick.bind(this))
  }

  inputs = document.querySelectorAll('input[type="checkbox"], input[type="number"], input[type="range"]')

  imgEditorEl = document.querySelector('#absolutePathToImageEditor_filename')
  imgEditorInput = document.querySelector('#absolutePathToImageEditor')
  revealKeyMapFileEl = document.querySelector('#revealKeyMapFile')
  signOutEl = document.querySelector('#signOut')

  // bind
  for (let el of inputs) {
    el.addEventListener('change', onChange.bind(this, el.name))
  }

  for (let el of document.querySelectorAll('input[type="range"]')) {
    el.addEventListener('input', onInput.bind(this, el.name))
  }

  imgEditorEl.addEventListener('click', onFilenameClick.bind(this))
  
  revealKeyMapFileEl.addEventListener('click', onRevealKeyMapFileClick.bind(this))

  signOutEl.addEventListener('click', onSignOut.bind(this))

  window.ondragover = () => { return false }
  window.ondragleave = () => { return false }
  window.ondragend = () => { return false }
  window.ondrop = () => { return false }

  window.onbeforeunload = (e) => {
    if (hasChanged) {
      let changedPrefs = {}
      for (let key in originalPrefs) {
        if (
          originalPrefs[key].constructor === Object ||
          originalPrefs[key].constructor === Array
        ) continue

        if (originalPrefs[key] !== prefs[key]) {
          changedPrefs[key] = prefs[key]
        }
      }
      ipcRenderer.send('prefs:change', changedPrefs)
    }
  }

  render()
}

init()
