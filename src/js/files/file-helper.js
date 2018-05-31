const path = require('path')
const fs = require('fs')

const importerPsd = require('../importers/psd')

/**
 * Retrieve an object with base 64 representations of an image file ready for storyboard pane layers.
 *  
 * @param {string} filepath 
 * @param {Object} options
 * @returns {Object} An object with data for notes (optional), reference (optional), and main
 */
let getBase64ImageDataFromFilePath = (filepath, options={ importTargetLayer: 'reference' }) => {
  let { importTargetLayer } = options
  let type = path.extname(filepath).toLowerCase()

  let result = {}
  switch (type) {
    case '.png':
      result[importTargetLayer] = getBase64TypeFromFilePath('png', filepath)
      break
    case '.jpg':
    case '.jpeg':
      result[importTargetLayer] = getBase64TypeFromFilePath('jpg', filepath)
      break
    case '.psd':
      try {
        result = getBase64TypeFromPhotoshopFilePath(filepath, options)
      } catch (err) {
        console.error(err)
        return null
      }
      break
  }
  return result
}

let getBase64TypeFromFilePath = (type, filepath) => {
  if (!fs.existsSync(filepath)) return null

  // via https://gist.github.com/mklabs/1260228/71d62802f82e5ac0bd97fcbd54b1214f501f7e77
  let data = fs.readFileSync(filepath).toString('base64')
  return `data:image/${type};base64,${data}`
}

const getBase64TypeFromPhotoshopFilePath = filepath => {
  if (!fs.existsSync(filepath)) return null

  let canvases = importerPsd.fromPsdBuffer(
    fs.readFileSync(
      filepath
    )
  )

  // convert in-place
  for (key in canvases) {
    canvases[key] = canvases[key].toDataURL()
  }

  // e.g.: { fill: 'data:image/png,...' }
  return canvases
}

// let getBase64TypeFromPhotoshopFilePath = (filepath, options) => {
//   throw new Error('getBase64TypeFromPhotoshopFilePath is deprecated. use readPhotoshopLayersAsCanvases instead')
// 
//   if (!fs.existsSync(filepath)) return null
// 
//   initializeCanvas((width, height) => {
//         let canvas = document.createElement('canvas');
//         canvas.width = width;
//         canvas.height = height;
//         return canvas;
//       });
// 
//   let psd
//   try {
//     const buffer = fs.readFileSync(filepath)
//     psd = readPsd(buffer)
//   } catch(exception) {
//     console.error(exception)
//     return null
//   }
// 
//   if(!psd || !psd.children) {
//     return;
//   }
// 
//   let mainCanvas = options.mainCanvas 
//   if(!mainCanvas) {
//     mainCanvas = document.createElement('canvas')
//     mainCanvas.width = psd.width
//     mainCanvas.height = psd.height
//   }
//   let mainContext = mainCanvas.getContext('2d');
//   mainContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height)
// 
//   let notesCanvas = options.notesCanvas
//   if(!notesCanvas) {
//     notesCanvas = document.createElement('canvas')
//     notesCanvas.width = psd.width
//     notesCanvas.height = psd.height
//   }
//   let notesContext = notesCanvas.getContext('2d');
//   notesContext.clearRect(0, 0, notesCanvas.width, notesCanvas.height)
// 
//   let referenceCanvas = options.referenceCanvas
//   if(!referenceCanvas) {
//     referenceCanvas = document.createElement('canvas')
//     referenceCanvas.width = psd.width
//     referenceCanvas.height = psd.height
//   }
//   let referenceContext = referenceCanvas.getContext('2d')
//   referenceContext.clearRect(0, 0, referenceCanvas.width, referenceCanvas.height)
// 
//   let numChannelValues = (1 << psd.bitsPerChannel) - 1
// 
//   // return target based on layer name (used for root)
//   let targetFromLayerName = layer => {
//     switch (layer.name) {
//       case "notes":
//         return notesContext
//         break
//       case "reference":
//         return referenceContext
//         break
//       default:
//         return mainContext
//         break
//     }
//   }
//   // return target which is always Storyboarder’s 'main' layer (used for all children, e.g.: in folders)
//   let targetAlwaysMain = () => mainContext
// 
//   let addLayersRecursively = (children, getTargetContext = targetFromLayerName) => {
//     for (let layer of children) {
//       if (
//         !layer.hidden &&                          // it's not hidden
//         layer.canvas &&                           // it has a canvas
//         layer.name.indexOf('Background') === -1   // it's not named as the Background layer
//       ) {
//         let targetContext = getTargetContext(layer)
//         targetContext.globalAlpha = layer.opacity / numChannelValues
//         targetContext.drawImage(layer.canvas, layer.left, layer.top)
//       }
// 
//       if (layer.children) {
//         addLayersRecursively(layer.children, targetAlwaysMain)
//       }
//     }
//   }
//   addLayersRecursively(psd.children)
// 
//   return {
//     main: mainCanvas.toDataURL(),
//     notes: notesCanvas.toDataURL(),
//     reference: referenceCanvas.toDataURL()
//   }
// }

module.exports = {
  getBase64ImageDataFromFilePath,
  getBase64TypeFromFilePath  
}
