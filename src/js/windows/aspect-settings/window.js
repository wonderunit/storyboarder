const { ipcRenderer } = require('electron')

ipcRenderer.on("languageChanged", (event, lng) => {
  i18n.changeLanguage(lng)
})

document.querySelectorAll('.example').forEach(el => {
    el.addEventListener('click', event => {
      ipcRenderer.send('changeAspectRatio', { aspectRatio: el.dataset.aspectRatio })
      event.preventDefault()
    })
})