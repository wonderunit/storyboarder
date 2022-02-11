const { ipcRenderer, shell } = require('electron')
const remote = require('@electron/remote')

//#region Localization
const i18n = require('../services/i18next.config')
remote.getCurrentWindow().on('focus', () => {
  menu.setWelcomeMenu(i18n)
})
i18n.on('loaded', (loaded) => {
  let lng = ipcRenderer.sendSync("getCurrentLanguage")
  i18n.changeLanguage(lng, () => {
    i18n.on("languageChanged", changeLanguage)
    updateHTMLText()
    updateRecentDocuments()
  })
  i18n.off('loaded')
})

const translateHtml = (elementName, traslationKey) => {
  let elem = document.querySelector(elementName)
  if(!elem) return
  let array =  i18n.t(traslationKey).split("\n")
  console.log("array", array)
  elem.innerHTML = array.map(text => { console.log(text); return `${text}<br/>`} ).join("")
}

const updateHTMLText = () => {
  translateHtml("#creation-title", "new-window.creation-title")
  translateHtml("#script-based-title", "new-window.script-based-title")
  translateHtml("#script-based-description", "new-window.script-based-description")
  translateHtml("#blank-title", "new-window.blank-title")
  translateHtml("#blank-description", "new-window.blank-description")
  translateHtml("#new-script", "new-window.new-script")
  translateHtml("#new-blank", "new-window.new-blank")
  translateHtml("#aspect-title", "new-window.aspect-title")
  translateHtml("#aspect-ultrawide", "new-window.aspect-ultrawide")
  translateHtml("#aspect-doublewide", "new-window.aspect-doublewide")
  translateHtml("#aspect-wide", "new-window.aspect-wide")
  translateHtml("#aspect-hd", "new-window.aspect-hd")
  translateHtml("#aspect-vertical-hd", "new-window.aspect-vertical-hd")
  translateHtml("#aspect-square", "new-window.aspect-square")
  translateHtml("#aspect-old", "new-window.aspect-old")
  translateHtml("#aspect-description", "new-window.aspect-description")
}

const changeLanguage = (lng) => {
  if(remote.getCurrentWindow().isFocused()) {
    menu.setWelcomeMenu(i18n)
  }
  updateHTMLText()
  updateRecentDocuments()
  ipcRenderer.send("languageChanged", lng)
}

ipcRenderer.on("languageChanged", (event, lng) => {
  i18n.off("languageChanged", changeLanguage)
  i18n.changeLanguage(lng, () => {
    i18n.on("languageChanged", changeLanguage)
    updateHTMLText()
  })
})

ipcRenderer.on("languageModified", (event, lng) => {
  i18n.reloadResources(lng).then(() => {updateHTMLText();} )
})

ipcRenderer.on("languageAdded", (event, lng) => {
  i18n.loadLanguages(lng).then(() => { i18n.changeLanguage(lng); })
})

ipcRenderer.on("languageRemoved", (event, lng) => {
  i18n.changeLanguage(lng)
})
//#endregion
// close
document.querySelector('#close-button').addEventListener('click', e => {
  ipcRenderer.send('playsfx', 'negative')
  let window = remote.getCurrentWindow()
  window.hide()
})

// new script-based
document.querySelector('#new-script').addEventListener('click', () => {
  ipcRenderer.send('openDialogue')
})

document.querySelector('#new-script').addEventListener("mouseover", () =>{
  ipcRenderer.send('playsfx', 'rollover')
})

document.querySelector('#new-script').addEventListener("pointerdown", () => {
  ipcRenderer.send('playsfx', 'down')
})

// new blank
document.querySelector('#new-blank').addEventListener('click', () => {
  // switch tabs
  document.querySelectorAll('.tab')[0].style.display = 'none'
  document.querySelectorAll('.tab')[1].style.display = 'block'
})

document.querySelector('#new-blank').addEventListener("mouseover", () => {
  ipcRenderer.send('playsfx', 'rollover')
})

document.querySelector('#new-blank').addEventListener("pointerdown", () => {
  ipcRenderer.send('playsfx', 'down')
})

window.ondragover = () => { return false }
window.ondragleave = () => { return false }
window.ondragend = () => { return false }
window.ondrop = () => { return false }

document.querySelectorAll('.example').forEach(el => {
  el.addEventListener('click', event => {
    ipcRenderer.send('createNew', el.dataset.aspectRatio)
    event.preventDefault()
  })
})

const setTab = index => {
  document.querySelectorAll('.tab').forEach(el => el.style.display = 'none')
  document.querySelectorAll('.tab')[index].style.display = 'block'
}

ipcRenderer.on('setTab', (event, index) => {
  setTab(index)
})

// start on tab 0
setTab(0)
