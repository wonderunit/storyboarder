const path = require('path')
const writePsd = require('ag-psd').writePsd

const exporterCommon = require('./common')

/*
interface Meta {
  name: string,
  canvas: HTMLCanvasElement
}
*/
const toPsdBuffer = async metas => {
  let psd = {
    width: 0,
    height: 0,
    imageResources: {
      // TODO what does this mean? why 3?
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
    // hack
    // "fix for external editor in storyboarder spec for clip studio pro"
    // see: https://github.com/wonderunit/storyboarder/commit/d22dd34
    let context = meta.canvas.getContext('2d')
    context.fillStyle = 'rgba(0, 0, 0, 0.1)'
    context.fillRect(0, 0, 1, 1)

    psd.children.push({
      id, // 
      name: meta.name,
      canvas: meta.canvas
    })

    psd.width = meta.canvas.width > psd.width ? meta.canvas.width : psd.width
    psd.height = meta.canvas.height > psd.height ? meta.canvas.height : psd.height

    id++
  }

  // generate a canvas for the Background layer
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
  toPsdBuffer
}
