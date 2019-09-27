const Voice = require('./Voice')

class Voicer {
  constructor(listener, max, buffer, options = { releaseTime: 0.05, voiceOptions: { positional: true } }) {
    this.max = max
    this.voices = []
    this.volume = 1
    for (let i = 0; i < this.max; i++) {
      let voice = new Voice(i, listener, options.voiceOptions)
      voice.setBuffer(buffer)
      voice.setReleaseTime(options.releaseTime)
      this.voices.push(voice)
    }
    this.curr = 0
  }
  setVolume (value) {
    this.volume = value
  }
  noteOn (target, options = {}) {
    this.noteOff(this.curr)

    this.curr = (this.curr + 1) % this.max
    let voice = this.voices[this.curr]
    if (options.buffer) {
      voice.setBuffer(options.buffer)
    }
    voice.noteOn(target, this.volume)
    return this.curr
  }
  noteOff (index) {
    let voice = this.voices[index]
    if (voice) voice.noteOff()
  }
  allNotesOff () {
    for (let i = 0; i < this.max; i++) {
      this.noteOff(i)
    }
  }
}

module.exports = Voicer
