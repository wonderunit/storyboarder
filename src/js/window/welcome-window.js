const {ipcRenderer, shell, remote} = require('electron')
const moment = require('moment')
const menu = require('../menu.js')
const util = require('../wonderunit-utils.js')
const sfx = require('../wonderunit-sound.js')

menu.setWelcomeMenu()

let updateRecentDocuments = () => {
  let count = 0
  let html = []
  let recentDocuments = remote.getGlobal('sharedObj').prefs['recentDocuments']
  if (recentDocuments) {
    for (var recentDocument of recentDocuments) {
      html.push(`<div class="recent-item" data-filename="${recentDocument.filename}"><img src="./img/fileicon.png"><div class="text">`)
      let filename = recentDocument.filename.split('/')
      filename = filename[filename.length-1]
      html.push(`<h2>${recentDocument.title}</h2>`)
      html.push(`${moment(recentDocument.time).fromNow().toUpperCase()} // ${util.msToTime(recentDocument.totalMovieTime)} / ${recentDocument.totalPageCount} PAGES / ${String(recentDocument.totalWordCount).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} WORDS`)
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
      recentDivs[i].addEventListener("mouseenter", sfx.rollover)
      recentDivs[i].addEventListener("mousedown", sfx.down)
    }
  }

  document.querySelector('#recent').scrollTop = 0
}

updateRecentDocuments()

document.querySelector('#close-button').onclick = (e) => {
  let window = remote.getCurrentWindow()
  window.close()
}

document.querySelector('iframe').onload = ()=>{
  Array.prototype.slice.call(document.querySelector('iframe').contentDocument.getElementsByTagName('a')).forEach((element)=>{
    element.onclick = (e)=> {
      shell.openExternal(e.currentTarget.href)
      e.preventDefault()
    }
    element.addEventListener("mouseover", sfx.rollover)
    element.addEventListener("mousedown", sfx.down)
  })  
}

document.querySelector('#getting-started').onclick = ()=> {
  //shell.openExternal("https://wonderunit.com")
}

document.querySelector('#open-storyboard').onclick = ()=> {
  ipcRenderer.send('openDialogue')
}

document.querySelector('#new-storyboard').onclick = ()=> {
  ipcRenderer.send('openNewWindow')
}

document.querySelector('#getting-started').addEventListener("mouseover", sfx.rollover)
document.querySelector('#open-storyboard').addEventListener("mouseover", sfx.rollover)
document.querySelector('#new-storyboard').addEventListener("mouseover", sfx.rollover)
document.querySelector('#getting-started').addEventListener("mousedown", sfx.error)
document.querySelector('#open-storyboard').addEventListener("mousedown", sfx.down)
document.querySelector('#new-storyboard').addEventListener("mousedown", sfx.positive)

ipcRenderer.on('playsfx', (event, args)=>{
  console.log("sup")
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
  }
})

ipcRenderer.on('updateRecentDocuments', (event, args)=>{
  updateRecentDocuments()
})