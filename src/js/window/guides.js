const EventEmitter = require('events').EventEmitter

const util = require('../utils/index.js')

const rgba = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${parseFloat(a)})`

class Guides extends EventEmitter {
  constructor () {
    super()
    this.state = {
      grid: false,
      center: false,
      thirds: false,
      diagonals: false,
    
      width: 0,
      height: 0
    }

    // for crisp lines
    // see: http://www.mobtowers.com/html5-canvas-crisp-lines-every-time/
    this.translateShift = 0.5

    this.lineColorMuted  = rgba(0, 0, 0, 0.1)
    this.lineColorNormal = rgba(0, 0, 0, 0.2)
    this.lineColorStrong = rgba(0, 0, 0, 0.4)
    this.lineColorWhite = rgba(255, 255, 255, 0.1)

    this.el = null
    this.canvas = null
    this.context = null
  }

  setState (newState) {
    if (!util.isUndefined(newState.width) &&
        newState.width != this.state.width) {
      this.canvas.width = newState.width
    }
    if (!util.isUndefined(newState.height) &&
        newState.height != this.state.height) {
      this.canvas.height = newState.height
    }

    this.state = Object.assign(this.state, newState)

    this.render()
  }

  create (el) {
    this.el = el
    this.canvas = document.createElement('canvas')
    this.canvas.style.zIndex = 199 // after layers, before cursor
    this.context = this.canvas.getContext('2d')
    this.context.globalAlpha = 1
    this.el.appendChild(this.canvas)
  }

  attachTo (target) {
    // move from current DOM position to inside target
    target.insertBefore(this.el, target.firstChild)
    let state = {
      width: parseFloat(target.style.width),
      height: parseFloat(target.style.height)
    }
    this.setState(state)
  }

  render () {
    let ctx = this.context
    ctx.clearRect(0, 0, this.state.width, this.state.height)

    // light
    if (this.state.grid)   this.drawGrid(this.context, this.state.width, this.state.height, this.lineColorWhite, 3)
    if (this.state.center) this.drawCenter(this.context, this.state.width, this.state.height, this.lineColorWhite, 3)
    if (this.state.thirds) this.drawThirds(this.context, this.state.width, this.state.height, this.lineColorWhite, 3)
    if (this.state.diagonals) this.drawDiagonals(this.context, this.state.width, this.state.height, this.lineColorWhite, 3)

    // dark
    if (this.state.grid)   this.drawGrid(this.context, this.state.width, this.state.height, this.lineColorMuted, 1)
    if (this.state.center) this.drawCenter(this.context, this.state.width, this.state.height, this.lineColorStrong, 1)
    if (this.state.thirds) this.drawThirds(this.context, this.state.width, this.state.height, this.lineColorStrong, 1)
    if (this.state.diagonals) this.drawDiagonals(this.context, this.state.width, this.state.height, this.lineColorNormal, 1)
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
    for (let n = 0; n < stepsX; n++) {
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

      context.translate(-this.translateShift, -this.translateShift)
    }
  }

  drawDiagonals (context, width, height, color, lineWidth) {
    let midpointX = Math.floor(width / 2)
    let midpointY = Math.floor(height / 2)
    context.translate(this.translateShift, this.translateShift)
    context.lineWidth = lineWidth
    context.strokeStyle = color

    // cross TL to BR
    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(width, height)
    context.stroke()
    // cross BL to TR
    context.beginPath()
    context.moveTo(0, height)
    context.lineTo(width, 0)
    context.stroke()

    // TL corner to B mid to TR corner
    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(midpointX, height)
    context.lineTo(width, 0)
    context.stroke()

    // BL corner to T mid to BR corner
    context.beginPath()
    context.moveTo(0, height)
    context.lineTo(midpointX, 0)
    context.lineTo(width, height)
    context.stroke()

    context.translate(-this.translateShift, -this.translateShift)
  }
}

module.exports = Guides
