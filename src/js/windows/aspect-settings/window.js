const { ipcRenderer } = require('electron')
const LocalizationService = require('../../utils/LocalizationService')
translateHtml = (elementName, translation) => {
  let elem = document.querySelector(elementName)
  if(!elem) return
  let array =  translation.split("\n")
  elem.innerHTML = array.map(text => `${text}<br/>`).join("")
}

const updateHTMLText = (i18n) => {
  translateHtml("#aspect-title", i18n.t("new-window.aspect-title"))
  translateHtml("#aspect-ultrawide", i18n.t("new-window.aspect-ultrawide"))
  translateHtml("#aspect-doublewide", i18n.t("new-window.aspect-doublewide"))
  translateHtml("#aspect-wide", i18n.t("new-window.aspect-wide"))
  translateHtml("#aspect-hd", i18n.t("new-window.aspect-hd"))
  translateHtml("#aspect-vertical-hd", i18n.t("new-window.aspect-vertical-hd"))
  translateHtml("#aspect-square", i18n.t("new-window.aspect-square"))
  translateHtml("#aspect-old", i18n.t("new-window.aspect-old"))
  translateHtml("#aspect-description", i18n.t("new-window.aspect-description"))
}

let localizationService = new LocalizationService(updateHTMLText)

document.querySelectorAll('.example').forEach(el => {
    el.addEventListener('click', event => {
      ipcRenderer.send('changeAspectRatio', { aspectRatio: el.dataset.aspectRatio })
      event.preventDefault()
    })
})