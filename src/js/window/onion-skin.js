const Cancelable = require('promise-cancelable').default
const { CancelationError } = require('promise-cancelable')
const fs = require('fs')
const path = require('path')

const exporterCommon = require('../exporters/common')

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

    this.tintCanvas = document.createElement('canvas')
    this.tintCanvas.width = this.width
    this.tintCanvas.height = this.height
    this.tintContext = this.tintCanvas.getContext('2d')

    this.onSetEnabled(this.state.enabled)
  }

  setState ({ pathToImages, currBoard, prevBoard, nextBoard, enabled }) {
    const currBoardChanged = currBoard && ((this.state.currBoard == null) || (currBoard.uid != this.state.currBoard.uid))
    const prevBoardChanged = prevBoard && ((this.state.prevBoard == null) || (prevBoard.uid != this.state.prevBoard.uid))
    const nextBoardChanged = nextBoard && ((this.state.nextBoard == null) || (nextBoard.uid != this.state.nextBoard.uid))
    const anyBoardChanged = currBoardChanged || prevBoardChanged || nextBoardChanged

    const enabledChanged = enabled != this.state.enabled

    this.state.pathToImages = pathToImages || this.state.pathToImages
    this.state.currBoard = currBoard || this.state.currBoard
    this.state.prevBoard = prevBoard || this.state.prevBoard
    this.state.nextBoard = nextBoard || this.state.nextBoard

    if (enabledChanged) {
      this.state.enabled = enabled
      this.onSetEnabled(this.state.enabled)
    }

    if (this.state.enabled && (anyBoardChanged || enabledChanged)) {
      this.load()
    }
  }

  // TODO should we use SketchPane's LayerCollection to setup and render these composites for us?
  // TODO cache images for re-use?
  async load () {
    const { pathToImages, currBoard, prevBoard, nextBoard } = this.state

    if (this.cancelable) this.cancelable.cancel()

    this.cancelable = new Cancelable(async (resolve, reject, onCancel) => {
      this.state.status = 'Loading'

      this.context.clearRect(0, 0, this.width, this.height)

      this.context.fillStyle = '#fff'
      this.context.fillRect(0, 0, this.width, this.height)

      for (let board of [prevBoard, nextBoard]) {
        if (!board) continue

        let color = board === prevBoard ? '#00f' : '#f00'

        try {
          // load the posterframe
          let image = await exporterCommon.getImage(
            path.join(
              pathToImages,
              `board-${board.number}-${board.uid}-posterframe.jpg` + '?' + Math.random()
            )
          )

          // tint
          this.tintContext.save()
          this.tintContext.clearRect(0, 0, this.width, this.height)
          this.tintContext.globalCompositeOperation = 'normal'
          // white box as a base
          this.tintContext.fillStyle = '#fff'
          this.tintContext.fillRect(0, 0, this.width, this.height)
          // draw the image
          this.tintContext.drawImage(image, 0, 0)
          // draw the screened color on top
          this.tintContext.globalCompositeOperation = 'screen'
          this.tintContext.fillStyle = color
          this.tintContext.fillRect(0, 0, this.width, this.height)
          this.tintContext.restore()

          // draw tinted canvas to main context
          this.context.save()
          this.context.globalAlpha = 0.35
          this.context.globalCompositeOperation = 'multiply'
          this.context.drawImage(this.tintContext.canvas, 0, 0)
          this.context.restore()
        } catch (err) {
          // couldn't load placeholder art
          console.warn(err)
        }
      }

      this.state.status = 'Success'

      this.onRender(this.canvas)

      onCancel(() => {
        this.context.clearRect(0, 0, this.width, this.height)
        // invalidate
        this.onRender(this.canvas)
      })
    }).catch(err => {
      // filter out CancelationError reporting
      if (err.name !== 'CancelationError') {
        throw err
      }
    })

    await this.cancelable
  }
}

module.exports = OnionSkin
