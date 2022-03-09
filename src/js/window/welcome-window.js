const {ipcRenderer, shell} = require('electron')
const remote = require('@electron/remote')
const path = require('path')
const moment = require('moment')
const menu = require('../menu')
const sfx = require('../wonderunit-sound')
const prefsModule = require('@electron/remote').require('./prefs')
const log = require('../shared/storyboarder-electron-log')
const pkg = require('../../../package.json')

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

const updateHTMLText = () => {
  document.querySelector('.recent').innerHTML = i18n.t("welcome-window.recentStoryboards")
  document.querySelector('#getting-started').innerHTML = i18n.t("menu.help.getting-started")
  document.querySelector('#new-storyboard').innerHTML = i18n.t("welcome-window.new-storyboard")
  document.querySelector('#open-storyboard').innerHTML = i18n.t("menu.file.open")
  let welcomeLine1 = document.querySelector('#welcome-line-1')
  if(welcomeLine1) welcomeLine1.innerHTML = i18n.t("welcome-window.welcome-line-1")
  let welcomeLine2 = document.querySelector('#welcome-line-2')
  if(welcomeLine2) welcomeLine2.innerHTML = i18n.t("welcome-window.welcome-line-2")
  let welcomeLine3 = document.querySelector('#welcome-line-3')
  if(welcomeLine3) welcomeLine3.innerHTML = i18n.t("welcome-window.welcome-line-3")
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
  i18n.reloadResources(lng).then(() => {updateHTMLText(); menu.setWelcomeMenu(i18n) } )
})

ipcRenderer.on("languageAdded", (event, lng) => {
  i18n.loadLanguages(lng).then(() => { i18n.changeLanguage(lng); })
})

ipcRenderer.on("languageRemoved", (event, lng) => {
  i18n.changeLanguage(lng)
  menu.setWelcomeMenu(i18n)
})
//#endregion

const onFileDrop = e => {
  e.preventDefault()
  if (!e || !e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) {
    return
  }
  for (let file of e.dataTransfer.files) {
    if (path.extname(file.name) === ".storyboarder" || path.extname(file.name) === ".fountain") {
      ipcRenderer.send('openFile', file.path)
      break
    }
  }
}

let updateRecentDocuments = () => {
  let count = 0
  let html = []

  let recentDocuments = prefsModule.getPrefs('welcome')['recentDocuments']
  console.log(recentDocuments)
  if (recentDocuments && recentDocuments.length>0) {
    for (var recentDocument of recentDocuments) {
      html.push(`<div class="recent-item" data-filename="${recentDocument.filename}"><img src="./img/fileicon.png" draggable="false"><div class="text">`)
      let filename = recentDocument.filename.split(path.sep)
      filename = filename[filename.length-1]
      html.push(`<h2>${recentDocument.title}</h2>`)

      let lastUpdated = moment(recentDocument.time).fromNow().toUpperCase()
      html.push(lastUpdated) // `// ${util.msToTime(recentDocument.totalMovieTime)} / ${recentDocument.totalPageCount} PAGES / ${String(recentDocument.totalWordCount).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} WORDS`)

      html.push('</div></div>')
      count++
    }
    document.querySelector('#recent').innerHTML = html.join('')
    document.querySelector('.recent').innerHTML = i18n.t("welcome-window.recentStoryboards")
    let recentDivs = document.querySelector("#recent").children
    for (var i = 0; i < recentDivs.length; i++) {
      recentDivs[i].onclick = (e)=>{
        console.log(e.currentTarget.dataset.filename)
        ipcRenderer.send('openFile', e.currentTarget.dataset.filename)
      }
      recentDivs[i].addEventListener("mouseenter", ()=>{sfx.rollover()})
      recentDivs[i].addEventListener("pointerdown", ()=>{sfx.down()})
    }
  }
  document.querySelector('#recent').scrollTop = 0
}

updateRecentDocuments()

document.querySelector('#close-button').onclick = () => {
  console.log('close')
  let window = remote.getCurrentWindow()
  window.close()
}

document.querySelector('iframe').onload = ()=>{
  Array.prototype.slice.call(document.querySelector('iframe').contentDocument.getElementsByTagName('a')).forEach((element)=>{
    element.onclick = (e)=> {
      shell.openExternal(e.currentTarget.href)
      e.preventDefault()
    }
    element.addEventListener("mouseover", ()=>{sfx.rollover()})
    element.addEventListener("pointerdown", ()=>{sfx.down()})
  })

  // handle dropping a file onto the iframe
  let contentDocument = document.querySelector('iframe').contentDocument
  contentDocument.ondragover = () => { return false }
  contentDocument.ondragleave = () => { return false }
  contentDocument.ondragend = () => { return false }
  contentDocument.ondrop = onFileDrop
}
document.querySelector('iframe').src = "https://wonderunit.com/ads/storyboarder?" + Math.round(Date.now() / 1000 / 60 / 6)

document.querySelector('#getting-started').onclick = event => {
  event.preventDefault()
  shell.openExternal("https://wonderunit.com/storyboarder/faq/#How-do-I-get-started")
}

document.querySelector('#open-storyboard').onclick = ()=> {
  document.querySelector('#open-storyboard').style.pointerEvents = 'none'
  setTimeout(()=>{document.querySelector('#open-storyboard').style.pointerEvents = 'auto'}, 1000)
  ipcRenderer.send('openDialogue')
}

document.querySelector('#new-storyboard').onclick = ()=> {
  ipcRenderer.send('openNewWindow')
}

document.querySelector('#getting-started').addEventListener("mouseover", ()=>{sfx.rollover()})
document.querySelector('#open-storyboard').addEventListener("mouseover", ()=>{sfx.rollover()})
document.querySelector('#new-storyboard' ).addEventListener("mouseover", ()=>{sfx.rollover()})
document.querySelector('#getting-started').addEventListener("pointerdown", ()=>{sfx.error()})
document.querySelector('#open-storyboard').addEventListener("pointerdown", ()=>{sfx.down()})
document.querySelector('#new-storyboard' ).addEventListener("pointerdown", ()=>{sfx.positive()})

document.querySelector("span[data-js='version-number']").innerHTML = ` v${pkg.version}`

ipcRenderer.on('playsfx', (event, args)=>{
  switch (args) {
    case 'negative':
      sfx.negative()
      break
    case 'rollover':
      sfx.rollover()
      break
    case 'down':
      sfx.down()
      break
    case 'error':
      sfx.error()
      break
  }
})

sfx.init()

ipcRenderer.on('updateRecentDocuments', (event, args)=>{
  updateRecentDocuments()
})

window.ondragover = () => { return false }
window.ondragleave = () => { return false }
window.ondragend = () => { return false }
window.ondrop = onFileDrop
