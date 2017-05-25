const fs = require('fs')
const path = require('path')

class OnionSkin {
  constructor (storyboarderSketchPane, boardPath) {
    this.storyboarderSketchPane = storyboarderSketchPane
    this.enabled = false
    this.isLoaded = false
    this.boardPath = boardPath

    this.setEnabled(false)
  }

  setEnabled (value) {
    this.enabled = value
    this.storyboarderSketchPane.sketchPane.setLayerOpacity(this.enabled ? 1 : 0, 2) // HACK hardcoded
    console.log('OnionSkin#setEnabled', this.enabled)
  }
  
  getEnabled () {
    return this.enabled
  }

  reset () {
    this.isLoaded = false
  }

  load (currBoard, prevBoard, nextBoard) {
    console.log('OnionSkin#load')
    this.isLoaded = false
    return new Promise((resolve, reject) => {
      let context = this.storyboarderSketchPane.sketchPane.getLayerContext(2) // HACK hardcoded
      let size = this.storyboarderSketchPane.sketchPane.getCanvasSize()

      // TODO if not enabled, clear the onion layer
      // TODO   (this works, but when re-enabled on a new board, needs to know enough to reload images it doesn't have...)
      // if (!this.enabled) {
      //   context.clearRect(0, 0, size.width, size.height)
      //   resolve()
      //   return
      // }

      console.log('OnionSkin :: load')

      let layersData = []
      let loaders = []

      for (let board of [prevBoard, nextBoard]) {
        if (!board) continue

        console.log('OnionSkin :: load', board.shot, board.url)
        
        let color = board == prevBoard ? '#00f' : '#f00'

        if (board.layers) {
          if (board.layers.reference && board.layers.reference.url) {
            layersData.push([0, board.layers.reference.url, color]) // HACK hardcoded index
          }
        }

        // always load the main layer
        layersData.push([1, board.url, color]) // HACK hardcoded index

        if (board.layers) {
          if (board.layers.notes && board.layers.notes.url) {
            layersData.push([3, board.layers.notes.url, color]) // HACK hardcoded index
          }
        }

        for (let [index, filename] of layersData) {
          loaders.push(new Promise((resolve, reject) => {
            let imageFilePath = path.join(this.boardPath, 'images', filename)
            try {
              if (fs.existsSync(imageFilePath)) {
                let image = new Image()
                image.onload = () => {
                  // resolve
                  resolve([filename, image])
                }
                image.onerror = err => {
                  // clear
                  console.warn(err)
                  resolve([filename, null])
                }
                image.src = imageFilePath + '?' + Math.random()
              } else {
                // clear
                resolve([filename, null])
              }
            } catch (err) {
              // clear
              resolve([filename, null])
            }
          }))
        }
      }

      // via https://stackoverflow.com/a/4231508
      Promise.all(loaders).then(result => {
        // key map for easier lookup
        let imagesByFilename = {}
        for (let [filename, image] of result) {
          if (image) imagesByFilename[filename] = image
        }

        let tmpCtx = this.storyboarderSketchPane.createContext()
        context.clearRect(0, 0, size.width, size.height)

        for (let [index, filename, color] of layersData) {
          // do we have an image for this particular layer index?
          let image = imagesByFilename[filename]
          if (image) {
            console.log('OnionSkin :: rendering layer index:', index, filename, color)
            tmpCtx.save()
            tmpCtx.fillStyle = color
            tmpCtx.fillRect(0, 0, size.width, size.height)
            // draw image to offscreen (with tint)
            tmpCtx.globalCompositeOperation = 'destination-atop'
            tmpCtx.drawImage(image, 0, 0)
            tmpCtx.restore()

            // draw image to onion layer
            context.save()
            context.globalAlpha = 0.01
            context.drawImage(image, 0, 0)
            // draw offscreen (with tint) to onion layer
            context.globalAlpha = 0.2 // strength of tint
            context.drawImage(tmpCtx.canvas, 0, 0)
            context.restore()
          } else {
            console.log('OnionSkin :: missing image for layer index:', index, filename, color)
          }
        }

        this.isLoaded = true
        resolve()
      })
    })
  }
}

module.exports = OnionSkin
