const shotTemplateSystem = new(require('../shot-template-system/'))({width: 2500, height: 900})

window.shotTemplateSystem = shotTemplateSystem

let numOfShots = 1

let shotParams

// shotParams = {
//     content: "OTS",
//     horizontalComposition:"auto",
//     shotType: "MS",
//     horizontalAngle: "left",
//     verticalAngle: "low",
// }

// shotParams = {
//     content: "oneShot",
//     horizontalComposition:"auto",
//     shotType: "CU",
//     verticalAngle: "birdsEye",
//     horizontalAngle: "left"
// }

// shotParams = {
//     content: "oneShot",
//     horizontalComposition:"auto",
//     shotType: "MS",
//     verticalAngle: "low",
// }

// shotParams = {
//     content: "oneShot",
//     horizontalComposition:"auto",
//     shotType: "LS"
// }

// shotParams = {
//     content: "oneShot",
// }

 shotParams = {}

document.querySelector("#button").addEventListener("click", (event)=>{
  
  for (var i = 0; i < numOfShots; i++) {
  var shot = shotTemplateSystem.requestShot(shotParams)
//{content: "oneShot"}
    var div = document.createElement('img')
  div.src = shot.image
  div.style.width = "500px";
  div.style.border = "1px solid black";
  document.querySelector("#shots").insertBefore(div, document.querySelector("img"))
  }


})





//document.getElementById('three').src = renderer.domElement.toDataURL()