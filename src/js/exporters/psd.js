const path = require('path')
const writePsd = require('ag-psd').writePsd

const exporterCommon = require('./common')

/*
interface ImageMeta {
  filepath: string
  name: string
}
*/
const imagesMetaToPSDBuffer = async metas => {
  let psd = {
    width: 0,
    height: 0,
    imageResources: {
      //
      // TODO
      // TODO
      // TODO
      //
      layerSelectionIds: [3]
    },
    children: [
      {
        id: 1,
        name: 'Background',
        canvas: undefined
      }
    ]
  }

  let id = 2 // 1 = Background, 2 = Layer #1
  for (meta of metas) {
    try {
      let image = await exporterCommon.getImage(meta.filepath)

      let canvas = document.createElement('canvas')
      let context = canvas.getContext('2d')

      // paranoia
      context.clearRect(0, 0, canvas.width, canvas.height)

      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      context.drawImage(image, 0, 0)

      // hack
      // TODO why is this required?
      context.fillStyle = 'rgba(0, 0, 0, 0.1)'
      context.fillRect(0, 0, 1, 1)

      psd.children.push({
        id, // 
        name: meta.name,
        canvas
      })

      psd.width = image.naturalWidth > psd.width ? image.naturalWidth : psd.width
      psd.height = image.naturalHeight > psd.height ? image.naturalHeight : psd.height

      id++
    } catch (err) {
      console.log(err)
      console.log(err.message)
      throw `could not load image: ${meta.filepath}`
    }
  }

  // generate the background canvas
  let canvas = document.createElement('canvas')
  canvas.width = psd.width
  canvas.height = psd.height
  var context = canvas.getContext('2d')
  context.fillStyle = 'white'
  context.fillRect(0, 0, canvas.width, canvas.height)
  psd.children[0].canvas = canvas

  return writePsd(psd)
}

module.exports = {
  imagesMetaToPSDBuffer
}
