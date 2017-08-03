const EventEmitter = require('events').EventEmitter

const ShotTemplateSystem = require('../shot-template-system')

let shotTemplateSystem
let emitter = new EventEmitter()

let attachListeners = () => {
  for (let element of document.querySelectorAll('#sts-select select')) {
    element.addEventListener("change", onSelectChange)
  }
}

let getAllSTSParamSelections = () => {
  params = {}
  for (let e of document.querySelectorAll('#sts-select select')) {
    if (e.options[e.selectedIndex].value) {
      params[e.id] = e.options[e.selectedIndex].value
    }
  }
  return params
}

let generateShot = (params) => {
  var shot = shotTemplateSystem.requestShot(params)
  var div = document.createElement('div')
  var img = document.createElement('img')
  img.src = shot.image
  img.dataset.shotParams = JSON.stringify(shot.shotParams)
  div.appendChild(img)
  document.querySelector("#sts-shots").insertBefore(div, document.querySelector("#sts-shots div"))
  div.addEventListener('dblclick', onShotDblclick)
  div.addEventListener("click", onShotClick)
}

const onInputKeyDown = event => {
  if (event.keyCode == 13) {
    var shotParams = shotTemplateSystem.parseParamsText(document.querySelector("#sts-input1").value)
    generateShot(shotParams)
    document.querySelector("#sts-select").innerHTML = ''
    document.querySelector("#sts-select").innerHTML = shotTemplateSystem.getParamSelects(shotParams)
    attachListeners()
  }
}

const onSelectChange = event => {
  if (event.target.value !== "") {
    event.target.className = "picked"
  } else {
    event.target.classList.remove("picked")
  }
  
  let params = getAllSTSParamSelections()
  document.querySelector("#sts-input1").value = shotTemplateSystem.getTextString(params)
  generateShot(params)
}

const onShotClick = event => {
  let shotParams = JSON.parse(event.target.firstChild.dataset.shotParams)
  document.querySelector("#sts-select").innerHTML = ''
  document.querySelector("#sts-select").innerHTML = shotTemplateSystem.getParamSelects(shotParams)
  document.querySelector("#sts-input1").value = shotTemplateSystem.getTextString(shotParams)
  attachListeners()
}

const onShotDblclick = event => {
  let shotParams = JSON.parse(event.target.firstChild.dataset.shotParams)
  let img = event.target.firstChild
  emitter.emit('select', img, shotParams)
}

const init = config => {
  shotTemplateSystem = new ShotTemplateSystem(config)
  window.shotTemplateSystem = shotTemplateSystem

  document.querySelector("#sts-input1").addEventListener('keydown', onInputKeyDown)
}

const reset = sts => {
  let shotParams = (sts && sts.params) ? sts.params : null
  document.querySelector("#sts-select").innerHTML = shotTemplateSystem.getParamSelects(shotParams)
  document.querySelector('#sts-shots').innerHTML = ''
  attachListeners()
}

//setTimeout(()=>{shotTemplateSystem.saveImagesToDisk(1000)}, 2000)

module.exports = Object.assign(emitter, {
  init,
  reset
})
