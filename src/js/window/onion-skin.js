const fs = require('fs')
const path = require('path')

class OnionSkin {
  constructor ({ width, height, onSetEnabled, onRender }) {
    this.width = width
    this.height = height
    this.onSetEnabled = onSetEnabled
    this.onRender = onRender

    this.state = {
      status: 'NotAsked',
      enabled: false,
      currBoard: undefined,
      prevBoard: undefined,
      nextBoard: undefined
    }

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.context = this.canvas.getContext('2d')

    this.tmpCanvas = document.createElement('canvas')
    this.tmpCanvas.width = this.width
    this.tmpCanvas.height = this.height
    this.tmpContext = this.tmpCanvas.getContext('2d')

    this.tintCanvas = document.createElement('canvas')
    this.tintCanvas.width = this.width
    this.tintCanvas.height = this.height
    this.tintContext = this.tintCanvas.getContext('2d')

    this.onSetEnabled(this.state.enabled)
  }

  setState ({ pathToImages, currBoard, prevBoard, nextBoard, enabled }) {
    let currBoardChanged = false
    let enabledChanged = false

    if (pathToImages && currBoard) {
      currBoardChanged = this.state.currBoard == null || (currBoard.uid != this.state.currBoard.uid)

      this.state.pathToImages = pathToImages
      this.state.currBoard = currBoard
      this.state.prevBoard = prevBoard
      this.state.nextBoard = nextBoard
    }

    if (enabled != this.state.enabled) {
      enabledChanged = true
      this.state.enabled = enabled
      this.onSetEnabled(this.state.enabled)
    }

    if (this.state.enabled && (currBoardChanged || enabledChanged)) {
      this.load()
    }
  }

  async load () {
    // TODO if already loading, cancel
    // TODO should we use SketchPane's LayerCollection to setup and render these composites for us?

    const { pathToImages, currBoard, prevBoard, nextBoard } = this.state

    this.state.status = 'Loading'

    this.context.clearRect(0, 0, this.width, this.height)

    this.context.fillStyle = '#fff'
    this.context.fillRect(0, 0, this.width, this.height)

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

      // layer compositing
      this.tmpContext.save()
      this.tmpContext.clearRect(0, 0, this.width, this.height)
      for (let [index, filename, image] of result) {
        if (image) {
          this.tmpContext.globalAlpha = (index === 0 ? board.layers.reference.opacity : 1.0)
          this.tmpContext.drawImage(image, 0, 0)
        }
      }
      this.tmpContext.restore()

      // tint
      this.tintContext.save()
      this.tintContext.clearRect(0, 0, this.width, this.height)
      this.tintContext.globalCompositeOperation = 'normal'
      // white box as a base
      this.tintContext.fillStyle = '#fff'
      this.tintContext.fillRect(0, 0, this.width, this.height)
      // draw the image
      this.tintContext.drawImage(this.tmpContext.canvas, 0, 0)
      // draw the screened color on top
      this.tintContext.globalCompositeOperation = 'screen'
      this.tintContext.fillStyle = color
      this.tintContext.fillRect(0, 0, this.width, this.height)
      this.tintContext.restore()

      // draw tinted canvas to main context
      this.context.save()
      this.context.globalAlpha = 0.5
      this.context.globalCompositeOperation = 'multiply'
      this.context.drawImage(this.tintContext.canvas, 0, 0)
      this.context.restore()
    }

    this.state.status = 'Success'

    this.onRender(this.canvas)
  }
}

module.exports = OnionSkin
