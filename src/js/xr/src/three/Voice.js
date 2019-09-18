const THREE = require('three')

class Voice {
  constructor (index, listener) {
    this.index = index
    this.audio = new THREE.PositionalAudio(listener)
    this.releaseTime = 0.05
  }
  setBuffer (buffer) {
    this.audio.setBuffer(buffer)
  }
  noteOn (target, volume) {
    let ctx = THREE.AudioContext.getContext()
    this.audio.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.001)
    this.audio.play()
    this.target = target
    if (this.target) {
      this.target.add(this.audio)
    }
  }
  noteOff (target) {
    if (this.audio.isPlaying) {
      let ctx = THREE.AudioContext.getContext()
      this.audio.gain.gain.setTargetAtTime(0, ctx.currentTime, this.releaseTime)
      setTimeout(
        () => {
          this.audio.stop()
          if (this.target) {
            this.target.remove(this.audio)
          }
        },
        this.releaseTime * 5 * 1000
      )
    }
  }
}

module.exports = Voice
