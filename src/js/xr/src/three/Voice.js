const THREE = require('three')

class Voice {
  constructor (index, listener) {
    this.index = index
    this.audio = new THREE.PositionalAudio(listener)
    this.releaseTime = 0.05
    this.isReleasing = false
  }
  setBuffer (buffer) {
    this.audio.setBuffer(buffer)
  }
  setReleaseTime (value) {
    this.releaseTime = value
  }
  noteOn (target, volume = 1) {
    let ctx = THREE.AudioContext.getContext()
    this.audio.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.001)
    this.audio.play()
    this.target = target
    if (this.target) {
      this.target.add(this.audio)
    }
  }
  noteOff () {
    if (this.audio.isPlaying && !this.isReleasing) {
      this.isReleasing = true
      let ctx = THREE.AudioContext.getContext()
      this.audio.gain.gain.setTargetAtTime(0, ctx.currentTime, this.releaseTime)
      setTimeout(
        () => {
          this.audio.stop()
          if (this.target) {
            this.target.remove(this.audio)
          }
          this.isReleasing = false
        },
        this.releaseTime * 5 * 1000
      )
    }
  }
}

module.exports = Voice
