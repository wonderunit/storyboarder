const Stats = require('stats.js')

module.exports = class {
  constructor () {
    this.stats = new Stats()
    this.stats.showPanel(0)
    this.stats.dom.style.top = '50px'

    document.body.appendChild(this.stats.dom)

    this.animate = this.animate.bind(this)

    window.requestAnimationFrame(this.animate)
  }

  animate () {
    this.stats.begin()
    this.stats.end()
    window.requestAnimationFrame(this.animate)
  }
}
