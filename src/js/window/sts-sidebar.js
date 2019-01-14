const EventEmitter = require('events').EventEmitter

const ShotTemplateSystem = require('../shot-template-system')
const sfx = require('../wonderunit-sound')

const { createIsEventMatchForCommand } = require('../utils/keytracker')

let shotTemplateSystem
let emitter = new EventEmitter()
let aspectRatio
let store
let isEventMatchForCommand

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
  img.dataset.camera = JSON.stringify(shotTemplateSystem.getCurrentCameraAsJSON())

  div.appendChild(img)
  document.querySelector("#sts-shots").insertBefore(div, document.querySelector("#sts-shots div"))
  div.addEventListener('dblclick', onShotDblclick)
  div.addEventListener("click", onShotClick)
  renderPlaceholders()
}

const resetImages = () => {
  document.querySelector('#sts-shots').innerHTML = ''
}

const addShot = () => {
  var shotParams = shotTemplateSystem.parseParamsText(document.querySelector("#sts-input1").value)
  generateShot(shotParams)
  sfx.playEffect('metal')
  renderSelects(shotTemplateSystem.getParamSelects(shotParams))
  attachListeners()
}

const renderPlaceholders = () => {
  let maxPlaceholders = 7

  let images = document.querySelectorAll('#sts-shots > div:not(.placeholder)')
  let placeholders = document.querySelectorAll('#sts-shots > div.placeholder')

  let numRequired = maxPlaceholders - images.length
  let numRendered = placeholders.length

  if (numRequired > numRendered) {
    // add some
    for (let i = numRendered; i < numRequired; i++) {
      var div = document.createElement('div')
      div.classList.add('placeholder')
      document.querySelector("#sts-shots").appendChild(div)
      // preserve aspect ratio of image
      let pct = 1 / aspectRatio * 100
      div.style.paddingBottom = pct + "%"
    }
  } else {
    if (numRendered > 0) {
      // remove some
      let numToRemove = numRendered - numRequired
      for (let i = 0; i < numToRemove; i++) {
        let el = document.querySelector('#sts-shots > div.placeholder:last-child')
        el.parentNode.removeChild(el)
      }
    }
  }
}

const renderSelects = selects => {
  document.querySelector("#sts-select").innerHTML = selects
  emitter.emit('change')
}

/* events */

const onInputKeyDown = event => {
  console.log('onInputKeyDown', 'input:commit:single-line')
  if (isEventMatchForCommand(event, "input:commit:single-line")) {
    addShot()
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
  sfx.bip('c6')
}

const onShotClick = event => {
  let shotParams = JSON.parse(event.target.firstChild.dataset.shotParams)
  renderSelects(shotTemplateSystem.getParamSelects(shotParams))
  document.querySelector("#sts-input1").value = shotTemplateSystem.getTextString(shotParams)
  attachListeners()
}

const onShotDblclick = event => {
  let shotParams = JSON.parse(event.target.firstChild.dataset.shotParams)
  let camera = JSON.parse(event.target.firstChild.dataset.camera)
  let img = event.target.firstChild
  sfx.playEffect('fill')
  emitter.emit('select', img, shotParams, camera)
}

const onRandom = event => {
  document.querySelector("#sts-input1").value = ''
  addShot()
}

/* exports */

const init = (_shotTemplateSystem, _aspectRatio, _store) => {

  document.querySelector("#shot-generator-container .flatbutton").addEventListener('click', event => {
    event.preventDefault()
    alert('Clicked Shot Generator')
  })
  return




  shotTemplateSystem = window.shotTemplateSystem = _shotTemplateSystem
  aspectRatio = _aspectRatio
  store = _store

  document.querySelector("#sts-input1").addEventListener('keydown', onInputKeyDown)
  document.querySelector('#sts-random').addEventListener('click', onRandom)

  document.querySelector("#shot-generator-container").addEventListener('click', ()=>{
    if (document.querySelector("#board-metadata .board-metadata-container").scrollTop == 0) {
      document.querySelector("#board-metadata .board-metadata-container").scrollTop = document.querySelector("#shot-generator-container").offsetTop
    }
  })

  // TODO rebind if store changes
  isEventMatchForCommand = createIsEventMatchForCommand(store)
}

const reset = sts => {
  let shotParams

  // if there is no data ...
  if (!sts || !sts.params) {
    // ... populate from existing select boxes ...
    shotParams = getAllSTSParamSelections()
    // document.querySelector("#sts-input1").value = shotTemplateSystem.getTextString(params)
  } else {
    // ... otherwise, populate from data
    shotParams = sts.params
    // ... and reset any current images
    resetImages()
  }

  renderPlaceholders()

  renderSelects(shotTemplateSystem.getParamSelects(shotParams))
  document.querySelector("#sts-input1").value = shotTemplateSystem.getTextString(shotParams)
  attachListeners()
}

const setEnabled = value => {
  if (!value) {
    let el = document.querySelector('#shot-generator-container')
    el.innerHTML = `
      <div class="inline"><svg class="smallicon"><use xlink:href="./img/symbol-defs.svg#icon-camera"></use></svg>Shot Generator</div>
      <div style="line-height: 1.25; padding: 6px 0; color: #777">
        Shot Generator has been disabled automatically because the graphics card on this machine cannot support its use of WebGL.
      </div>
    `
  }
}

//setTimeout(()=>{shotTemplateSystem.saveImagesToDisk(1000)}, 2000)

module.exports = Object.assign(emitter, {
  init,
  reset,
  setEnabled
})
