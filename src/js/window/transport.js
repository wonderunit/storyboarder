const EventEmitter = require('events').EventEmitter

class Transport extends EventEmitter {
  constructor (el) {
    super()
    this.state = { playbackMode: false }
    this.setup()
    this.render()
  }
  
  setState (newState) {
    this.state = Object.assign(this.state, newState)
    this.render()
  }
  
  setup () {
    this.el = document.getElementById('playback')

    this.onButtonSelect = this.onButtonSelect.bind(this)

    for (let btn of this.el.querySelectorAll('.transport-control')) {
      btn.addEventListener('pointerdown', this.onButtonSelect)
    }
  }
  
  onButtonSelect (event) {
    this.emit(event.target.dataset.action)
    event.preventDefault()
  }
  
  render () {
    let playButton = this.el.querySelector('.transport-control[data-action="togglePlayback"]')
    let svgUse = playButton.querySelector('svg use')

    if (this.state.playbackMode) {
      svgUse.setAttribute('xlink:href', svgUse.getAttribute('xlink:href').split('#')[0] + '#icon-pause')
    } else {
      svgUse.setAttribute('xlink:href', svgUse.getAttribute('xlink:href').split('#')[0] + '#icon-play')
    }
  }
}

module.exports = Transport
