const Voice = require('./Voice')

class Voicer {
  constructor(listener, max, buffer) {
    this.max = max
    this.voices = []
    for (let i = 0; i < this.max; i++) {
      let voice = new Voice(i, listener)
      voice.setBuffer(buffer)
      this.voices.push(voice)
    }
    this.curr = 0
    this.volume = 1
  }
  setVolume (value) {
    this.volume = value
  }
  noteOn (target) {
    this.noteOff(this.curr)

    this.curr = (this.curr + 1) % this.max
    let voice = this.voices[this.curr]
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
