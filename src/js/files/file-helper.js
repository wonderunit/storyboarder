const path = require('path')
const fs = require('fs')
const readPsd = require('ag-psd').readPsd
const initializeCanvas = require('ag-psd').initializeCanvas
const writePsd = require('ag-psd').writePsd

/**
 * Retrieve an ojbect with base 64 representations of an image file ready for storyboard pane layers.
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
      result = getBase64TypeFromPhotoshopFilePath(filepath, options)
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

const getBase64TypeFromPhotoshopFilePath = (filepath, options) => {
  const canvases = readPhotoshopLayersAsCanvases(filepath)
  return {
    main: canvases.main && canvases.main.toDataURL(),
    notes: canvases.notes && canvases.notes.toDataURL(),
    reference: canvases.reference && canvases.reference.toDataURL()
  }
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

let readPhotoshopLayersAsCanvases = filepath => {
  console.log('FileHelper#readPhotoshopLayersAsCanvases')

  if (!fs.existsSync(filepath)) return

  // setup the PSD reader's initializeCanvas function
  initializeCanvas(
    (width, height) => {
      let canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      return canvas
    }
  )

  let psd

  try {
    const buffer = fs.readFileSync(filepath)
    psd = readPsd(buffer)
  } catch (exception) {
    console.error(exception)
    return
  }

  if (!psd) {
    console.warn('PSD is invalid', psd)
    return
  }

  console.log('got psd', psd)

  let numChannelValues = (1 << psd.bitsPerChannel) - 1

  let canvases = { }

  const canvasNameForLayer = name => {
    name = name.toLowerCase()
    if (name === 'reference' || name === 'notes') {
      return name
    } else {
      return 'main'
    }
  }

  const addLayersRecursively = (children, root) => {
    console.log('addLayersRecursively adding', children.length, 'layers')
    for (let layer of children) {
      if (
        // not hidden
        !layer.hidden &&
        // has canvas
        layer.canvas &&
        // not named "Background"
        layer.name.indexOf('Background') === -1
      ) {
        let name = root ? canvasNameForLayer(layer.name) : 'main'
        if (!canvases[name]) {
          console.log('\tadding canvas', name)
          canvases[name] = document.createElement('canvas')
          canvases[name].width = psd.width
          canvases[name].height = psd.height
        }
        let canvas = canvases[name]
        let context = canvas.getContext('2d')

        console.log('\tdrawing to canvas', name, 'from', layer.name)

        // composite the PSD layer canvas (which may have a smaller rect) to full-size canvas
        context.globalAlpha = layer.opacity / numChannelValues
        context.drawImage(layer.canvas, layer.left, layer.top)
        console.log('\tdrawing complete')
      }

      if (layer.children) {
        addLayersRecursively(layer.children, false)
      }
    }
  }

  if (psd.children) {
    // PSD with multiple layers
    addLayersRecursively(psd.children, true)
  } else {
    // PSD with a single layer
    canvases.reference = psd.canvas
  }

  return canvases
}

let writePhotoshopFileFromPNGPathLayers = (pngPathLayers, psdPath, options) => {
  return new Promise((fulfill, reject)=>{
    let children = []
    let psdWidth = 0
    let psdHeight = 0
    let loadPromises = pngPathLayers.map((layerObject, i)=>{
      let child = {
        "id": (i+2),
        "name": layerObject.name
      }
      children.push(child)
      return new Promise((fulfill, reject) => {
        let curCanvas = document.createElement('canvas')
        let context = curCanvas.getContext('2d')
        let curLayerImg = new Image()
        curLayerImg.onload = () => {
          curCanvas.width = curLayerImg.width
          curCanvas.height = curLayerImg.height
          context.drawImage(curLayerImg, 0, 0)
          // hack
          context.fillStyle = 'rgba(0,0,0,0.1)'
          context.fillRect(0,0, 1, 1)
          child.canvas = curCanvas
          psdWidth = curLayerImg.width > psdWidth ? curLayerImg.width : psdWidth
          psdHeight = curLayerImg.height > psdHeight ? curLayerImg.height : psdHeight
          i++
          fulfill()
        }
        curLayerImg.onerror = () => {
          let message = `could not load image: ${layerObject.url}`
          console.warn(message)
          reject(message)
        }
        curLayerImg.src = layerObject.url
      })  
    })

    return Promise.all(loadPromises)
      .then(()=>{
        var whiteBG = document.createElement('canvas')
        whiteBG.width = psdWidth
        whiteBG.height = psdHeight
        var whiteBGContext = whiteBG.getContext('2d')
        whiteBGContext.fillStyle = 'white'
        whiteBGContext.fillRect(0, 0, whiteBG.width, whiteBG.height)
        children = [{
          "id": 1,
          "name": "Background",
          "canvas": whiteBG
        }].concat(children)
        let psd = {
          width: psdWidth,
          height: psdHeight,
          imageResources: {layerSelectionIds: [3] },
          children: children
        };

        const buffer = writePsd(psd)
        fs.writeFileSync(psdPath, buffer)
        fulfill()
      })
      .catch(error => {
        console.error(error)
        reject(error)
      })

  })

}

module.exports = {
  getBase64ImageDataFromFilePath,
  getBase64TypeFromFilePath,
  writePhotoshopFileFromPNGPathLayers,

  readPhotoshopLayersAsCanvases
}
