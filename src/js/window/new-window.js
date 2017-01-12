const {ipcRenderer, shell, remote} = require('electron')

document.querySelector('#close-button').onclick = (e) => {
  ipcRenderer.send('playsfx', 'negative')
  let window = remote.getCurrentWindow()
  window.hide()
}

document.querySelector('#new-script').onclick = ()=> {
  ipcRenderer.send('openDialogue')
}

document.querySelector('#new-script').addEventListener("mouseover", ()=>{
  ipcRenderer.send('playsfx', 'rollover')
})

document.querySelector('#new-script').addEventListener("mousedown", ()=>{
  ipcRenderer.send('playsfx', 'down')
})

document.querySelector('#new-blank').onclick = ()=> {
  ipcRenderer.send('createNew')
}

document.querySelector('#new-blank').addEventListener("mouseover", ()=>{
  ipcRenderer.send('playsfx', 'rollover')
})

document.querySelector('#new-blank').addEventListener("mousedown", ()=>{
  ipcRenderer.send('playsfx', 'down')
})