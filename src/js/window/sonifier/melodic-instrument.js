const Tone = require('tone')
const tonal = require('tonal')
const throttle = require('lodash.throttle')

const util = require('../../utils')

module.exports = () => {
  const chords = ["Amadd9", "GMadd9", "Bm7#5", "FMadd9", "Am7#5", "E7", "EMadd9", "G#m7#5", "EM", "Em#5"]

  let synth = new Tone.PolySynth(8, Tone.Synth)
    .set({
      "oscillator" : {
        "type" : "square2"
      },
      "envelope" : {
        "attack": 2,
        "decay": 0.7,
        "sustain": 1,
        "release": 0.1,
      },
    })

  let bassSynth2 = new Tone.PolySynth(3, Tone.Synth)
    .set({
      "oscillator" : {
        "type" : "sine"
      },
      "envelope" : {
        "attack": 3,
        "decay": 0.01,
        "sustain": 0.1,
        "release": 7,
      },
    })

  const synthComp = new Tone.Compressor(-10, 5)

  const synthFilter = new Tone.Filter(1250, "lowpass", -12)
    .set('Q', 2)

  var synthVol = new Tone.Volume(-12)

  // var bassSynth2Filter = new Tone.Filter(1250, "lowpass", -48)
  //   .set('Q', 2)
  var bassSynth2Vol = new Tone.Volume(-12)

  var verb = new Tone.Freeverb(0.96, 1000)
  verb.wet = 1

  synth.chain(synthComp, synthFilter, synthVol, verb, Tone.Master)
  bassSynth2.chain(bassSynth2Vol, verb, Tone.Master)

  let currentNote
  let currentChord

  let lastChangeAt = null
  let shouldTrigger = false

  const start = () => {
    currentNote = 0
    currentChord = util.sample(chords)
    
    lastChangeAt = Date.now()
    shouldTrigger = true
  }

  const stop = () => {

  }

  const trigger = (opt = { velocity: 1 }) => {
    const { velocity } = opt

    // been at least 150 msecs since last change
    if (!shouldTrigger &&
        lastChangeAt && 
        Date.now() - lastChangeAt > 1000) 
    {
      lastChangeAt = Date.now()
      shouldTrigger = true
      // reset
      currentNote = 0
    }

    if (!shouldTrigger) return

    const chord = currentChord
    const notes = tonal.chord(chord)

    const note = util.sample(notes) + (Math.random() > 0.5 ? '3' : '4')
    const onote = util.sample(notes) + (Math.random() > 0.5 ? '3' : '4')
    const bnote = util.sample(notes) + (Math.random() > 0.5 ? '2' : '3')

    synth.triggerAttackRelease(
      Tone.Frequency(note).transpose(+12),
      "32n",
      undefined,
      velocity)

    synth.triggerAttackRelease(Tone.Frequency(note).transpose(+12), "32n", undefined, velocity * 0.5)
    
    if (currentNote == 0) {
      bassSynth2.triggerAttackRelease(Tone.Frequency(bnote).transpose(+12), "16n", undefined, 0.4)
    }
    
    synth.triggerAttackRelease(Tone.Frequency(onote).transpose(+24), "16n", undefined, velocity * 0.5)

    currentNote++
    shouldTrigger = false
  }

  const triggerChange = () => {
    console.log('triggerChange')
    lastChangeAt = Date.now()
    shouldTrigger = true
  }

  const setGain = value => {
    // TODO
  }

  return {
    start,
    stop,
    trigger, //: throttle(trigger, 16 * 8),
    triggerChange,
    setGain
  }
}
