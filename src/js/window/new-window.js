const { ipcRenderer, shell, remote } = require('electron')

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

document.querySelector('#new-script').addEventListener("mousedown", () => {
  ipcRenderer.send('playsfx', 'down')
})

// new blank
document.querySelector('#new-blank').addEventListener('click') = () => {
  ipcRenderer.send('createNew')
})

document.querySelector('#new-blank').addEventListener("mouseover", () => {
  ipcRenderer.send('playsfx', 'rollover')
})

document.querySelector('#new-blank').addEventListener("mousedown", () => {
  ipcRenderer.send('playsfx', 'down')
})

window.ondragover = () => { return false }
window.ondragleave = () => { return false }
window.ondragend = () => { return false }
window.ondrop = () => { return false }
