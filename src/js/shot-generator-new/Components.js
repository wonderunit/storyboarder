const { ipcRenderer } = require('electron')
const React = require('react')
const Stats = require('stats.js')
const SceneContext = React.createContext()

let stats
ipcRenderer.on('shot-generator:menu:view:fps-meter', (event, value) => {
  console.log('shot-generator:menu:view:fps-meter', event, value)
  if (!stats) {
    stats = new Stats()
    stats.showPanel(0)
    document.body.appendChild( stats.dom )
    stats.dom.style.top = '7px'
    stats.dom.style.left = '460px'
  } else {
    document.body.removeChild( stats.dom )
    stats = undefined
  }
})

module.exports = {
  SceneContext,
  stats
}
