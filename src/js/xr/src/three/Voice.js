const THREE = require('three')

class Voice {
  constructor (index, listener, options = { positional: false }) {
    this.index = index
    if (options.positional) {
      this.audio = new THREE.PositionalAudio(listener)
    } else {
      this.audio = new THREE.Audio(listener)
    }
    this.releaseTime = 0.05
    this.isReleasing = false
    this.timeout = null
  }
  setBuffer (buffer) {
    this.audio.setBuffer(buffer)
  }
  setReleaseTime (value) {
    this.releaseTime = value
  }
  noteOn (target, volume = 1) {
    let ctx = THREE.AudioContext.getContext()
    if (this.timeout) {
      this.onReleaseEnd()
      clearTimeout(this.timeout)
    }
    if (this.audio.isPlaying) {
      // rewind
      this.audio.stop()
    }
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
      this.timeout = setTimeout(
        () => this.onReleaseEnd(),
        this.releaseTime * 5 * 1000
      )
    }
  }
  onReleaseEnd () {
    this.audio.stop()
    if (this.target) {
      this.target.remove(this.audio)
    }
    this.isReleasing = false
  }
}

module.exports = Voice
