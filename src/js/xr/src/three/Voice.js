const THREE = require('three')

class Voice {
  constructor(index, listener) {
    this.index = index
    this.audio = new THREE.PositionalAudio(listener)
    this.releaseTime = 0.05
  }
  setBuffer (buffer) {
    this.audio.setBuffer(buffer)
  }
  noteOn () {
    let ctx = THREE.AudioContext.getContext()
    this.audio.gain.gain.setTargetAtTime(1, ctx.currentTime, 0.001)
    this.audio.play()
  }
  noteOff () {
    if (this.audio.isPlaying) {
      let ctx = THREE.AudioContext.getContext()
      this.audio.gain.gain.setTargetAtTime(0, ctx.currentTime, this.releaseTime)
      setTimeout(
        () => this.audio.stop(),
        this.releaseTime * 5 * 1000
      )
    }
  }
}

module.exports = Voice
