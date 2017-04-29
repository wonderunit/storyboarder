const shotTemplateSystem = new(require('../shot-template-system/'))({width: 2500, height: 900})

window.shotTemplateSystem = shotTemplateSystem

document.querySelector("#button").addEventListener("click", (event)=>{
  var shot = shotTemplateSystem.requestShot()

  var div = document.createElement('img')
  div.src = shot.image
  div.style.width = "900px";
  div.style.border = "1px solid black";
  document.querySelector("#shots").insertBefore(div, document.querySelector("img"))




})

//document.getElementById('three').src = renderer.domElement.toDataURL()