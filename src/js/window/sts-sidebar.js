const shotTemplateSystem = new(require('../shot-template-system/'))({width: 2500, height: 900})

window.shotTemplateSystem = shotTemplateSystem

document.querySelector("#sts-input1").onkeydown = function(event) {
  if (event.keyCode == 13) {
    var shotParams = shotTemplateSystem.parseParamsText(document.querySelector("#sts-input1").value)
    generateShot(shotParams)
    document.querySelector("#sts-select").innerHTML = ''
    document.querySelector("#sts-select").innerHTML = shotTemplateSystem.getParamSelects(shotParams)
    attachListeners()
  }
}

let attachListeners = () => {
  for (let element of document.querySelectorAll('#sts-select select')) {
    element.addEventListener("change", (event) => {
      if (event.target.value !== "") {
        element.className = "picked"
      } else {
        element.classList.remove("picked")
      }
      
      let params = getAllSTSParamSelections()
      document.querySelector("#sts-input1").value = shotTemplateSystem.getTextString(params)
      generateShot(params)
    })
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
  div.addEventListener("click", (event) => {
    let shotParams = JSON.parse(event.target.firstChild.dataset.shotParams)
    document.querySelector("#sts-select").innerHTML = ''
    document.querySelector("#sts-select").innerHTML = shotTemplateSystem.getParamSelects(shotParams)
    document.querySelector("#sts-input1").value = shotTemplateSystem.getTextString(shotParams)
    attachListeners()
  })
}

init = () => {
  document.querySelector("#sts-select").innerHTML = shotTemplateSystem.getParamSelects()
  attachListeners()
}

//setTimeout(()=>{shotTemplateSystem.saveImagesToDisk(1000)}, 2000)

module.exports = {
  init
}
