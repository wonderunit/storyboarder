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

//#region Localization
const { settings:languageSettings } = require('./js/services/language.config')
const i18n = require('./js/services/i18next.config')
i18n.on('loaded', (loaded) => {
  languageSettings._loadFile()
  let lng = languageSettings.getSettingByKey('selectedLanguage')
  i18n.changeLanguage(lng, () => {
    updateHTML()
    i18n.on("languageChanged", changeLanguage)
  })
  i18n.off('loaded')
})

const changeLanguage = (lng) => {
  updateHTML()
  ipcRenderer.send("languageChanged", lng)
}

ipcRenderer.on("languageChanged", (event, lng) => {
  i18n.off("languageChanged", changeLanguage)
  i18n.changeLanguage(lng, () => {
    updateHTML()
    i18n.on("languageChanged", changeLanguage)
  })
})

ipcRenderer.on("languageModified", (event, lng) => {
  languageSettings._loadFile()
  i18n.reloadResources(lng).then(() => {updateHTML();})
  initializeLanguageList()
})

ipcRenderer.on("languageAdded", (event, lng) => {
  languageSettings._loadFile()
  i18n.loadLanguages(lng).then(() => { i18n.changeLanguage(lng); })
  initializeLanguageList()
})

ipcRenderer.on("languageRemoved", (event, lng) => {
  languageSettings._loadFile()
  i18n.changeLanguage(lng)
  initializeLanguageList()
})

const withLastChild = (selector, fn) => {
  let parent = document.querySelector(selector)
  if (parent && parent.lastChild) fn(parent.lastChild)
}

const translateText = (selector, key) => withLastChild(selector, el => el.textContent = i18n.t(key))
const translateHtml = (selector, key) => withLastChild(selector, el => el.innerHTML = i18n.t(key))

const updateHTML = () => {
  translateText("#preferences-title", "preferences.title")
  translateText("#restart-hint",  "preferences.restart-hint")
  translateText("#show-tooltips",      "preferences.show-tooltips")
  translateText("#save-automatically", "preferences.save-automatically")
  translateText("#saving-hint", "preferences.saving-hint")
  translateText("#force-psd-reload", "preferences.force-psd-reload")
  translateText("#psd-reload-hint", "preferences.psd-reload-hint")
  translateText("#default-timing", "preferences.default-timing")
  translateText("#external-psd-editor", "preferences.external-psd-editor")
  translateText("#psd-editor-hint", "preferences.psd-editor-hint")
  translateText("#reveal-keymap-file", "preferences.reveal-keymap-file")
  translateText("#reveal-keymap-file-hint", "preferences.reveal-keymap-file-hint")
  translateText("#show-diagnostics", "preferences.show-diagnostics")
  translateText("#show-diagnostics-hint", "preferences.show-diagnostics-hint")
  translateText("#line-delay", "preferences.line-delay")
  translateHtml("#line-delay-hint", "preferences.line-delay-hint")
  translateText("#notifications", "preferences.notifications")
  translateText("#show-notifications", "preferences.show-notifications")
  translateText("#aspirational-message", "preferences.aspirational-message")
  translateText("#notifications-line-mileage", "preferences.notifications-line-mileage")
  translateText("#sounds", "preferences.sounds")
  translateHtml("#sounds-hint", "preferences.sounds-hint")
  translateText("#drawing-sound-effect", "preferences.drawing-sound-effect")
  translateText("#drawing-melodies", "preferences.drawing-melodies")
  translateText("#ui-sound-effect", "preferences.ui-sound-effect")
  translateText("#enable-high-quality-audio", "preferences.enable-high-quality-audio")
  translateText("#performance-enhancements", "preferences.performance-enhancements")
  translateText("#performance-enhancements-hint", "preferences.performance-enhancements-hint")
  translateText("#high-quality-drawing-engine", "preferences.high-quality-drawing-engine")
  translateText("#high-quality-drawing-engine-hint", "preferences.high-quality-drawing-engine-hint")
  translateText("#languages", "preferences.languages")
  translateText("#languages-hint", "preferences.languages-hint")
  translateText("#open-language-editor", "preferences.open-language-editor")
  translateText("#sign-out", "preferences.sign-out")
  translateText("#sign-out-hint", "preferences.sign-out-hint")
  translateText("#thanks-for-support", "preferences.thanks-for-support")
  translateText("#additional-features-for-support", "preferences.additional-features-for-support")
  translateText("#add-watermark", "preferences.add-watermark")
  translateText("#custom-watermark", "preferences.custom-watermark")
}
//#endregion

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
    { title: 'Select Image Editor Application' }
  ).then(({ filePaths }) => {
    event.target.style.pointerEvents = 'auto'

    if (filePaths.length) {
      prefsModule.set('absolutePathToImageEditor', filePaths[0], true)
      render()
    } else {
      prefsModule.set('absolutePathToImageEditor', undefined, true)
      render()
    }
  }).catch(err => console.error(err))
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
    }
  ).then(({ filePaths }) => {
    event.target.style.pointerEvents = 'auto'

    if (filePaths.length) {
      try {
        let filepath = filePaths[0]
        fs.copySync(filepath, path.join(remote.app.getPath('userData'), 'watermark.png'))
        prefsModule.set('userWatermark', path.basename(filepath), true)
      } catch (err) {
        console.error(err)
        alert(err)
      }
      render()
    } else {
      prefsModule.set('userWatermark', undefined, true)
      render()
    }
  }).catch(err => console.error(err))
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

  let enableNotificationsEl = document.querySelector('#enableNotifications')
  if (enableNotificationsEl) {
    for (let child of [document.querySelector('#enableAspirationalMessages'), document.querySelector('#allowNotificationsForLineMileage')]) {
      child.disabled = !enableNotificationsEl.checked
      child.parentNode.style.opacity = enableNotificationsEl.checked
        ? 1
        : 0.5
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

const showDropContent = () => {
  document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn-container')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

const openLanguageEditor = () => {
  ipcRenderer.send('openLanguagePreferences')
}

let selectedOption

const selectLanguage = (language) => {
  languageSettings.setSettingByKey('selectedLanguage', language.fileName)
  i18n.changeLanguage(language.fileName)
}

const initializeLanguageList = () => {
  let languages = languageSettings.getSettingByKey('builtInLanguages').concat(languageSettings.getSettingByKey('customLanguages'))
  let button = document.getElementsByClassName("dropbtn")[0]
  let buttonContainer = document.getElementsByClassName("dropbtn-container")[0]
  let selectedLanguage = languageSettings.getSettingByKey('selectedLanguage')
  button.textContent = languages.find((item) => item.fileName === selectedLanguage).displayName
  buttonContainer.onclick = showDropContent
  let optionContainer = document.getElementById("myDropdown")
  optionContainer.innerHTML = ''
  for(let i = 0; i < languages.length; i++ ) {
    let option = document.createElement("div")
    let language = languages[i]
    option.textContent = language.displayName
    if(selectedLanguage === language.fileName) {
      option.classList.toggle("selected")
      selectedOption = option
    }
    option.onclick = (event) => { 
      button.textContent = event.target.textContent 
      selectedOption.classList.remove("selected")
      option.classList.toggle("selected")
      selectedOption = option
      selectLanguage(language)
    }
    optionContainer.appendChild(option)
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

  initializeLanguageList()
  let languageEditor = document.getElementsByClassName('open-language-editor')[0].children[0]
  languageEditor.onclick = openLanguageEditor

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
