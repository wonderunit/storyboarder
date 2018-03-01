const { remote, ipcRenderer, shell } = require('electron')
const jwt = require('jsonwebtoken')
const path = require('path')

const util = require('./js/utils')
const prefsModule = require('electron').remote.require('./prefs')

let prefs,
    inputs,
    imgEditorEl,
    imgEditorInput,
    revealKeyMapFileEl

const onChange = (name, event) => {
  let el = event.target
  if (el.type == 'checkbox') {
    prefsModule.set(name, el.checked, true)
  } else if (el.type == 'number') {
    prefsModule.set(name, el.value, true)
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
}

const init = () => {
  prefs = prefsModule.getPrefs('prefs window')

  inputs = document.querySelectorAll('input[type="checkbox"], input[type="number"]')

  imgEditorEl = document.querySelector('#absolutePathToImageEditor_filename')
  imgEditorInput = document.querySelector('#absolutePathToImageEditor')
  revealKeyMapFileEl = document.querySelector('#revealKeyMapFile')
  signOutEl = document.querySelector('#signOut')

  // bind
  for (let el of inputs) {
    el.addEventListener('change', onChange.bind(this, el.name))
  }

  imgEditorEl.addEventListener('click', onFilenameClick.bind(this))
  
  revealKeyMapFileEl.addEventListener('click', onRevealKeyMapFileClick.bind(this))

  signOutEl.addEventListener('click', onSignOut.bind(this))

  window.ondragover = () => { return false }
  window.ondragleave = () => { return false }
  window.ondragend = () => { return false }
  window.ondrop = () => { return false }

  render()
}

init()
