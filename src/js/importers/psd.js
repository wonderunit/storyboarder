const { readPsd, initializeCanvas } = require('ag-psd')

const fromPsdBuffer = buffer => {
  console.log('fromPsdBuffer')

  // setup the PSD reader's initializeCanvas function
  initializeCanvas(
    (width, height) => {
      let canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      return canvas
    }
  )

  let importable = [
    'reference',
    'fill',
    'tone',
    'pencil',
    'ink',
    'notes'
  ]

  let psd
  try {
    psd = readPsd(buffer)
  } catch (err) {
    console.error(err)
  }

  if (!psd) {
    console.warn('PSD is invalid', psd)
    return
  }

  console.log('got psd')

  let numChannelValues = (1 << psd.bitsPerChannel) - 1

  let canvases = { }

  const canvasNameForLayer = name => {
    name = name.toLowerCase()
    if (importable.includes(name)) {
      return name
    } else {
      return 'fill'
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
        let name = root ? canvasNameForLayer(layer.name) : 'fill'
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

module.exports = {
  fromPsdBuffer
}
