const EventEmitter = require('events').EventEmitter
const Tether = require('tether')

const util = require('../utils/index.js')

// HACK
Tether.modules.push({
  position: function(_arg) {
    if (this.options.onResize) this.options.onResize()
  }
})

class Guides extends EventEmitter {
  constructor () {
    super()
    this.state = {
      grid: false,
      center: false,
      thirds: false,
    
      width: 0,
      height: 0
    }
    
    this.el = null
    this.canvas = null
    this.context = null

    this.target = null
    this.tethered = null
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
    this.context = this.canvas.getContext('2d')
    this.el.appendChild(this.canvas)
  }
  
  attachTo (target) {
    this.target = target

    this.tethered = new Tether({
      element: this.el,
      target: this.target,
      attachment: 'top left',
      targetAttachment: 'top left',

      onResize: this.onTargetResize.bind(this)
    })
  }
  
  render () {
    let ctx = this.context
    ctx.clearRect(0, 0, this.state.width, this.state.height)

    ctx.font = '24px sans-serif'
    ctx.fillText(`
      guides @ ${this.state.width} x ${this.state.height}
      grid:${this.state.grid ? 'Y' : 'N'}
      center:${this.state.center ? 'Y' : 'N'}
      thirds:${this.state.thirds ? 'Y' : 'N'}
      `,
      10,
      50)
  }
  
  onTargetResize () {
    let bounds = this.target.getBoundingClientRect()

    let width = bounds.right - bounds.left
    let height = bounds.bottom - bounds.top
    
    this.setState({ width, height })
  }
}

module.exports = Guides
