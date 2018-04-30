const fs = require('fs')
const path = require('path')

class OnionSkin {
  constructor ({ width, height, onSetEnabled, onRender }) {
    this.width = width
    this.height = height
    this.onSetEnabled = onSetEnabled
    this.onRender = onRender

    this.state = { status: 'NotAsked', enabled: false }

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.context = this.canvas.getContext('2d')

    this.tmpCanvas = document.createElement('canvas')
    this.tmpCanvas.width = this.width
    this.tmpCanvas.height = this.height
    this.tmpContext = this.tmpCanvas.getContext('2d')

    this.setEnabled(false)
  }

  setEnabled (value) {
    this.state.enabled = value

    this.onSetEnabled(value)
  }

  async load (pathToImages, currBoard, prevBoard, nextBoard) {
    // TODO if already loading, cancel
    // TODO should we use SketchPane's LayerCollection to setup and render these composites for us?

    this.state.status = 'Loading'

    this.context.clearRect(0, 0, this.width, this.height)
    for (let board of [prevBoard, nextBoard]) {
      if (!board) continue

      let color = board === prevBoard ? '#00f' : '#f00'

      // HACK hardcoded
      let layersData = [
        // reference layer (if present)
        ...(board.layers && board.layers.reference)
          ? [[0, board.layers.reference.url]]
          : [],
      
        // always load the main layer
        [1, board.url],
      
        // notes layer (if present)
        ...(board.layers && board.layers.notes)
          ? [[2, board.layers.notes.url]]
          : [],
      ]
    
      let loaders = layersData.map(
        ([index, filename]) =>
          new Promise((resolve, reject) => {
            let imageFilePath = path.join(pathToImages, filename)
            let image = new Image()
            image.onload = () => resolve([index, filename, image])
            image.onerror = () => resolve([index, filename, null])
            image.src = imageFilePath + '?' + Math.random()
          })
      )

      let result = await Promise.all(loaders)

      this.tmpContext.clearRect(0, 0, this.width, this.height)
      for (let [index, filename, image] of result) {
        if (image) {
          // tinting (via https://stackoverflow.com/a/4231508)
          // draw image to tmp with tint
          this.tmpContext.save()
          this.tmpContext.fillStyle = color
          this.tmpContext.fillRect(0, 0, this.width, this.height)
          this.tmpContext.globalCompositeOperation = 'destination-atop'
          this.tmpContext.drawImage(image, 0, 0)
          this.tmpContext.restore()

          // draw faint representation of real image to onion layer
          this.context.save()
          this.context.globalAlpha = 0.01
          this.context.drawImage(image, 0, 0)
          // draw tinted canvas to onion layer
          this.context.globalAlpha = 0.2 * (index === 0 ? board.layers.reference.opacity : 1.0) // strength of tint
          this.context.drawImage(this.tmpContext.canvas, 0, 0)
          this.context.restore()
        }
      }
    }

    this.state.status = 'Success'

    this.onRender(this.canvas)
  }
}

module.exports = OnionSkin
