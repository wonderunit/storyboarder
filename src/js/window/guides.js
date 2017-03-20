const EventEmitter = require('events').EventEmitter

const util = require('../utils/index.js')

class Guides extends EventEmitter {
  constructor () {
    super()
    this.state = {
      grid: false,
      center: false,
      thirds: false,
      perspective: false,
    
      width: 0,
      height: 0
    }
    
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
      width: parseFloat(target.style.width, 10),
      height: parseFloat(target.style.height, 10)
    }
    this.setState(state)
  }

  render () {
    let ctx = this.context
    ctx.clearRect(0, 0, this.state.width, this.state.height)

    if (this.state.grid)   this.drawGrid(this.context, this.state.width, this.state.height)
    if (this.state.center) this.drawCenter(this.context, this.state.width, this.state.height)
    if (this.state.thirds) this.drawThirds(this.context, this.state.width, this.state.height)
    if (this.state.perspective) this.drawPerspective(this.context, this.state.width, this.state.height)
  }

  drawGrid (context, width, height) {
    let squareSize = 50
    let centerX = width / 2
    let stepsX = width / squareSize
    let stepsY = height / squareSize
    let offsetX = (width / 2) % squareSize
    let offsetY = (height / 2) % squareSize
    context.beginPath()
    context.lineWidth = 1
    context.strokeStyle = '#000'
    for (let n = 0; n < stepsX; n++) {
      let x = (n * squareSize) + offsetX
      context.moveTo(...[x, 0].map(Math.floor))
      context.lineTo(...[x, height].map(Math.floor))
      context.stroke()
    }
    for (let n = 0; n < stepsX; n++) {
      let y = (n * squareSize) + offsetY
      context.moveTo(...[0, y].map(Math.floor))
      context.lineTo(...[width, y].map(Math.floor))
      context.stroke()
    }
  }

  drawCenter (context, width, height) {
    let midpointX = Math.floor(width / 2)
    let midpointY = Math.floor(height / 2)
    context.beginPath()
    context.lineWidth = 1
    context.strokeStyle = '#000'

    // horizontal
    context.moveTo(0, midpointY)
    context.lineTo(width, midpointY)
    context.stroke()

    // vertical
    context.moveTo(midpointX, 0)
    context.lineTo(midpointX, height)
    context.stroke()
  }

  drawThirds (context, width, height) {
    context.beginPath()
    context.lineWidth = 1
    context.strokeStyle = '#000'

    let w0 = width / 3
    let h0 = height / 3

    for (let n = 0; n < 3; n++) {
      let x = n * w0
      let y = n * h0

      context.moveTo(...[x, 0].map(Math.floor))
      context.lineTo(...[x, height].map(Math.floor))
      context.stroke()

      context.moveTo(...[0, y].map(Math.floor))
      context.lineTo(...[width, y].map(Math.floor))
      context.stroke()
    }
  }

  drawPerspective (context, width, height) {
    let midpointX = Math.floor(width / 2)
    let midpointY = Math.floor(height / 2)
    context.beginPath()
    context.lineWidth = 1
    context.strokeStyle = '#000'

    // cross TL to BR
    context.moveTo(0, 0)
    context.lineTo(width, height)
    context.stroke()
    // cross BL to TR
    context.moveTo(0, height)
    context.lineTo(width, 0)
    context.stroke()

    // TL corner to B mid to TR corner
    context.moveTo(0, 0)
    context.lineTo(midpointX, height)
    context.lineTo(width, 0)
    context.stroke()

    // BL corner to T mid to BR corner
    context.moveTo(0, height)
    context.lineTo(midpointX, 0)
    context.lineTo(width, height)
    context.stroke()
  }
}

module.exports = Guides
