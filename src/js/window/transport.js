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
    let playButton = this.el.querySelector('.transport-control[data-action="play"]')

    if (this.state.playbackMode) {
      playButton.style.border = '1px solid red'
    } else {
      playButton.style.border = 'none'
    }
  }
}

module.exports = Transport
