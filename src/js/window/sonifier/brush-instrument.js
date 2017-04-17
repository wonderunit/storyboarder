const Tone = require('tone')

const FilteredEffect = function () {
	Tone.Effect.apply(this, arguments)

  this.filter = new Tone.Filter({
    type: "bandpass",
    frequency: 9000,
    rolloff: -24,
    Q: 1
  })
	this.connectEffect(this.filter)
}
Tone.extend(FilteredEffect, Tone.Effect)

module.exports = (opt = { samplePath: './snd/drawing-loop.wav' }) => {
  let sampler = new Tone.Player(opt.samplePath)
    .set('loop', true)
    .set('retrigger', false)
    .set('volume', -12)
    .stop()
  
  let filterA = new Tone.Filter({
    type: "bandpass",
    frequency: 9000,
    rolloff: -24,
    Q: 1
  })

  let filterB = new FilteredEffect({
    type: "lowpass",
    frequency: 900,
    rolloff: -48,
    Q: 1
  })

  let gain = new Tone.Gain({ gain: 1 })

  // let amp = new Tone.Gain({ gain: 1 })
  // let lfo = new Tone.LFO(4.25, 0.1, 0.5)
  // lfo.connect(amp.gain).start()

  sampler.chain(filterA, filterB, gain/*, amp*/, Tone.Master)
  filterB.wet.value = 0.2

  const noteOn = () => {
    gain.gain.cancelScheduledValues()
    gain.gain.value = 0
    // amp.gain.value = 0

    if (sampler.buffer.loaded) {
      const offset = Math.random() * sampler.buffer.duration

      sampler.reverse = false

      sampler.start(0, offset)
    } else {
      console.warn('sound has not loaded')
    }
  }

  const noteOff = () => {
    gain.gain.cancelScheduledValues()
    gain.gain.rampTo(0, 0.01)
    sampler.stop()
  }

  const setGain = (v = 1.0) => {
    gain.gain.value = v
  }
  
  const setWarble = (warble, fast) => {
    let speed = fast ? 0.05 : 0.5
    if (warble) {
      filterB.filter.frequency.rampTo(3000, 0.05)
    } else {
      filterB.filter.frequency.rampTo(9000, 0.05)
    }
  }

  return {
    noteOn,
    noteOff,

    setGain,
    setWarble
  }
}
