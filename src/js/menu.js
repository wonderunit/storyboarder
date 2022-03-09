const { ipcRenderer } = require('electron')

const setWelcomeMenu = () =>
  ipcRenderer.send('menu:setWelcomeMenu')

const setShotGeneratorMenu = () =>
  ipcRenderer.send('menu:setShotGeneratorMenu')

const setMenu = () =>
  ipcRenderer.send('menu:setMenu')

const setPrintProjectMenu = () =>
  ipcRenderer.send('menu:setPrintProjectMenu')

const setEnableAudition = (value) =>
  ipcRenderer.send('menu:setEnableAudition', value)

module.exports = {
  setWelcomeMenu,
  setShotGeneratorMenu,
  setMenu,
  setPrintProjectMenu,
  setEnableAudition
}
