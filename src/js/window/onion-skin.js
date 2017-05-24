const fs = require('fs')
const path = require('path')

class OnionSkin {
  constructor (storyboarderSketchPane, boardPath) {
    this.storyboarderSketchPane = storyboarderSketchPane
    this.enabled = false
    this.boardPath = boardPath

    this.setEnabled(false)
  }

  setEnabled (value) {
    this.enabled = value
    this.storyboarderSketchPane.sketchPane.setLayerOpacity(this.enabled ? 1 : 0, 2) // HACK hardcoded
    console.log('OnionSkin#setEnabled', this.enabled)
  }
  
  load (currBoard, prevBoard, nextBoard) {
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

        if (board.layers) {
          if (board.layers.reference && board.layers.reference.url) {
            layersData.push([0, board.layers.reference.url]) // HACK hardcoded index
          }
        }

        // always load the main layer
        layersData.push([1, board.url]) // HACK hardcoded index

        if (board.layers) {
          if (board.layers.notes && board.layers.notes.url) {
            layersData.push([3, board.layers.notes.url]) // HACK hardcoded index
          }
        }

        for (let [index, filename] of layersData) {
          loaders.push(new Promise((resolve, reject) => {
            let imageFilePath = path.join(this.boardPath, 'images', filename)
            try {
              if (fs.existsSync(imageFilePath)) {
                let image = new Image()
                image.onload = () => {
                  // draw
                  resolve([index, image])
                }
                image.onerror = err => {
                  // clear
                  console.warn(err)
                  resolve([index, null])
                }
                image.src = imageFilePath + '?' + Math.random()
              } else {
                // clear
                resolve([index, null])
              }
            } catch (err) {
              // clear
              resolve([index, null])
            }
          }))
        }
      }

      Promise.all(loaders).then(result => {
        context.save()
        context.globalAlpha = 0.25
        context.clearRect(0, 0, size.width, size.height)
        for (let [index, filename] of layersData) {

          // key map for easier looku
          let imagesToDrawByLayerIndex = []
          for (let [index, image] of result) {
            if (image) {
              imagesToDrawByLayerIndex[index] = image
            }
          }

          // do we have an image for this particular layer index?
          let image = imagesToDrawByLayerIndex[index]
          if (image) {
            console.log('OnionSkin :: rendering layer index:', index, filename)
            context.drawImage(image, 0, 0)
          } else {
            console.log('OnionSkin :: missing image for layer index:', index, filename)
          }
        }
        context.restore()

        resolve()
      })
    })
  }
}

module.exports = OnionSkin
