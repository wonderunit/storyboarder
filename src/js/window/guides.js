const EventEmitter = require('events').EventEmitter

const util = require('../utils/index')

const rgba = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${parseFloat(a)})`

class Guides extends EventEmitter {
  constructor (el, opt = {}) {
    super()

    this.state = {
      grid: false,
      center: false,
      thirds: false,
      perspective: false
    }

    // for crisp lines
    // see: http://www.mobtowers.com/html5-canvas-crisp-lines-every-time/
    this.translateShift = 0.5

    this.canvas = null
    this.context = null
    this.offscreenCanvas = null
    this.offscreenContext = null

    this.perspectiveGridFn = opt.perspectiveGridFn
    this.perspectiveParams = {
      cameraParams: {},
      rotation: 0
    }

    this.attachTo(el)
    this.render()
  }

  setState (newState) {
    this.state = Object.assign(this.state, newState)

    this.render()
  }

  attachTo (canvas) {
    this.canvas = canvas
    this.context = this.canvas.getContext('2d')

    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenContext = this.offscreenCanvas.getContext('2d')

    this.offscreenCanvas.width = this.canvas.width
    this.offscreenCanvas.height = this.canvas.height
    
    this.width = this.canvas.width
    this.height = this.canvas.height
  }

  render () {
    let ctx = this.context
    ctx.clearRect(0, 0, this.width, this.height)

    const lineColorMuted  = [0, 0, 0, 0.1]
    const lineColorNormal = [0, 0, 0, 0.2]
    const lineColorStrong = [0, 0, 0, 0.4]
    const lineColorWhite = [255, 255, 255, 0.1]

    //
    //
    // light
    //
    this.offscreenContext.clearRect(0, 0, this.width, this.height)
    if (this.state.grid)   this.drawGrid(this.offscreenContext, this.width, this.height, rgba(...lineColorWhite.slice(0, 3), 1.0), 3)
    if (this.state.center) this.drawCenter(this.offscreenContext, this.width, this.height, rgba(...lineColorWhite.slice(0, 3), 1.0), 3)
    if (this.state.thirds) this.drawThirds(this.offscreenContext, this.width, this.height, rgba(...lineColorWhite.slice(0, 3), 1.0), 3)

    this.context.globalAlpha = lineColorWhite.slice(-1)[0]
    this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)
    this.context.globalAlpha = 1.0

    //
    //
    // dark
    //
    // grid
    this.offscreenContext.clearRect(0, 0, this.width, this.height)
    if (this.state.grid)   this.drawGrid(this.offscreenContext, this.width, this.height, rgba(...lineColorMuted.slice(0, 3), 1.0), 1)
    this.context.globalAlpha = lineColorMuted.slice(-1)[0]
    this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)

    // center
    this.offscreenContext.clearRect(0, 0, this.width, this.height)
    if (this.state.center) this.drawCenter(this.offscreenContext, this.width, this.height, rgba(...lineColorStrong.slice(0, 3), 1.0), 1)
    this.context.globalAlpha = lineColorStrong.slice(-1)[0]
    this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)

    // muted
    this.offscreenContext.clearRect(0, 0, this.width, this.height)
    if (this.state.thirds) this.drawThirds(this.offscreenContext, this.width, this.height, rgba(...lineColorStrong.slice(0, 3), 1.0), 1)
    this.context.globalAlpha = lineColorStrong.slice(-1)[0]
    this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)

    // perspective
    if (this.state.perspective) {
      this.offscreenContext.clearRect(0, 0, this.width, this.height)
      this.drawPerspective(this.offscreenContext, this.width, this.height)

      this.context.globalAlpha = lineColorStrong.slice(-1)[0]
      this.context.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)
      this.context.globalAlpha = 1.0
    }

    this.context.globalAlpha = 1.0
  }

  drawGrid (context, width, height, color, lineWidth) {
    context.translate(this.translateShift, this.translateShift)
    let squareSize = 50
    let centerX = width / 2
    let stepsX = width / squareSize
    let stepsY = height / squareSize
    let offsetX = (width / 2) % squareSize
    let offsetY = (height / 2) % squareSize
    context.lineWidth = lineWidth
    context.strokeStyle = color
    for (let n = 0; n < stepsX; n++) {
      let x = (n * squareSize) + offsetX
      context.beginPath()
      context.moveTo(...[x, 0].map(Math.floor))
      context.lineTo(...[x, height].map(Math.floor))
      context.stroke()
    }
    for (let n = 0; n < stepsY; n++) {
      context.beginPath()
      let y = (n * squareSize) + offsetY
      context.moveTo(...[0, y].map(Math.floor))
      context.lineTo(...[width, y].map(Math.floor))
      context.stroke()
    }
    context.translate(-this.translateShift, -this.translateShift)
  }

  drawCenter (context, width, height, color, lineWidth) {
    let midpointX = Math.floor(width / 2)
    let midpointY = Math.floor(height / 2)
    context.translate(this.translateShift, this.translateShift)
    context.lineWidth = lineWidth
    context.strokeStyle = color

    // horizontal
    context.beginPath()
    context.moveTo(0, midpointY)
    context.lineTo(width, midpointY)
    context.stroke()

    // vertical
    context.beginPath()
    context.moveTo(midpointX, 0)
    context.lineTo(midpointX, height)
    context.stroke()
    context.translate(-this.translateShift, -this.translateShift)
  }

  drawThirds (context, width, height, color, lineWidth) {
    context.translate(this.translateShift, this.translateShift)

    context.lineWidth = lineWidth
    context.strokeStyle = color

    let w0 = width / 3
    let h0 = height / 3

    for (let n = 1; n < 3; n++) {
      let x = n * w0
      let y = n * h0

      context.beginPath()
      context.moveTo(...[x, 0].map(Math.floor))
      context.lineTo(...[x, height].map(Math.floor))
      context.stroke()

      context.beginPath()
      context.moveTo(...[0, y].map(Math.floor))
      context.lineTo(...[width, y].map(Math.floor))
      context.stroke()
    }
    context.translate(-this.translateShift, -this.translateShift)
  }

  drawPerspective (context, width, height) {
    let canvas = this.perspectiveGridFn(
      this.perspectiveParams.cameraParams,
      this.perspectiveParams.rotation
    )
    context.save()
    context.translate(0, 0)
    context.moveTo(0, 0)
    context.drawImage(canvas, 0, 0)
    context.restore()
  }

  setPerspectiveParams (opt = {}) {
    this.perspectiveParams = {
      cameraParams: opt.cameraParams,
      rotation: opt.rotation
    }
    this.render()
  }
}

module.exports = Guides
