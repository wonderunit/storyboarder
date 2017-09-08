const {ipcRenderer, shell, remote} = require('electron')
const path = require('path')
const moment = require('moment')
const menu = require('../menu.js')
const util = require('../utils/index.js')
const sfx = require('../wonderunit-sound.js')
const prefsModule = require('electron').remote.require('./prefs.js')

const pkg = require('../../../package.json')

menu.setWelcomeMenu()

let updateRecentDocuments = () => {
  let count = 0
  let html = []

  let recentDocuments = prefsModule.getPrefs('welcome')['recentDocuments']
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
    document.querySelector('.recent').innerHTML = "RECENT STORYBOARDS"
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
}
document.querySelector('iframe').src = "https://wonderunit.com/ads/storyboarder?" + Math.round(Date.now() / 1000 / 60 / 6)

document.querySelector('#getting-started').onclick = ()=> {
  //shell.openExternal("https://wonderunit.com")
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
window.ondrop = e => {
  e.preventDefault()
  if(!e || !e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) {
    return
  }
  for(let file of e.dataTransfer.files) {
    if(file.name.indexOf(".storyboarder") > -1) {
      hasStoryboarderFile = true
      ipcRenderer.send('openFile', file.path)
      break
    }
  }
}
