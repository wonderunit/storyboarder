const shotTemplateSystem = new(require('../shot-template-system/'))({width: 2500, height: 900})

window.shotTemplateSystem = shotTemplateSystem

let numOfShots = 1
let imageSize = 500

let shotParams = {}

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
//     verticalAngle: "eye",
//     horizontalAngle: "left",
//     shotType: "LS",

// }

// shotParams = {
//     content: "oneShot",
//     horizontalComposition:"auto",
//     verticalAngle: "eye",
//     horizontalAngle:"left"
// }

shotParams = {
    content: "oneShot",
}

document.querySelector("#input1").onkeydown = function(event) {
  if (event.keyCode == 13) {
    generateAction()
  }
}

document.querySelector("#button").addEventListener("click", (event)=>{
  generateAction()

})


let generateAction = () => {
  var shotParams = shotTemplateSystem.parseParamsText(document.querySelector("#input1").value)

  console.log(shotParams)

  for (var i = 0; i < numOfShots; i++) {
    var shot = shotTemplateSystem.requestShot(shotParams)
    var div = document.createElement('img')
    div.src = shot.image
    document.querySelector("#shots").insertBefore(div, document.querySelector("img"))
  }

}