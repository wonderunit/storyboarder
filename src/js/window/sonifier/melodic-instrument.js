const Tone = require('tone')

const remote = require('@electron/remote')
const prefsModule = remote.require('./prefs')
const enableHighQualityAudio = prefsModule.getPrefs('melo hi gual')['enableHighQualityAudio']

const util = require('../../utils')

let progression = [
  ['a4', 'b4', 'c5', 'e5'],
  ['g4', 'a4', 'b4', 'd5'],
  ['f4', 'g4', 'a4', 'c5'],
  ['b4', 'd5', 'e5', 'g#5'],
  ['c5', 'f5', 'g5', 'a5'],
  ['b4', 'e5', 'f#5', 'g#5'],
  ['c5', 'f5', 'g5', 'a5'],
  ['e5', 'g#5', 'b5', 'e6'],
].reduce((a, b) => {
  a.push(b)
  // repetition
  a.push(util.shuffle(b)) // TODO musical variation
  return a
}, [])
// flatten
progression = [].concat(...progression)

const Sequence = (_list = [], offset = 0) => {
  let curr = offset
  let list = _list
  const next = () => {
    let index = ++curr % list.length
    return list[index]
  }
  const recent = () => list[curr % list.length]
  return {
    next,
    recent
  }
}

module.exports = () => {
  let seq = Sequence(progression, 0) // , Math.floor(Math.random() * progression.length)

  let synth = new Tone.PolySynth(enableHighQualityAudio ? 8 : 6, Tone.Synth)
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

  let bassSynth2 = new Tone.PolySynth(enableHighQualityAudio ? 3 : 1, Tone.Synth)
    .set({
      "oscillator" : {
        "type" : "sine"
      },
      "envelope" : {
        "attack": 4,
        "decay": 2,
        "sustain": 0.1,
        "release": 2,
      },
    })

  const synthFilter = new Tone.Filter(1250, "lowpass", -12)
    .set('Q', 0)

  var synthVol = new Tone.Volume(-6)

  var bassSynth2Vol = new Tone.Volume(enableHighQualityAudio ? -6 : -16) // reduce volume when reverb is not available

  let verb
  if (enableHighQualityAudio) {
    verb = new Tone.Freeverb(0.96, 1000).set('wet', 0.1)
    synth.chain(synthFilter, synthVol, verb, Tone.Master)
    bassSynth2.chain(bassSynth2Vol, verb, Tone.Master)
  } else {
    synth.chain(synthFilter, synthVol, Tone.Master)
    bassSynth2.chain(bassSynth2Vol, Tone.Master)
  }

  let lastChangeAt = null
  let shouldTrigger = false
  let firstNote = false

  const start = () => {
    lastChangeAt = Date.now()
    shouldTrigger = true

    firstNote = true
    seq.next()
  }

  const stop = () => {}

  const trigger = (opt = { velocity: 1 }) => {
    const { velocity } = opt

    // been at least n msecs since last change
    if (!shouldTrigger &&
        lastChangeAt && 
        Date.now() - lastChangeAt > 250)
    {
      lastChangeAt = Date.now()
      shouldTrigger = true
      seq.next()
    }

    if (!shouldTrigger) return

    if (firstNote) {
      bassSynth2.triggerAttackRelease(
        Tone.Frequency(seq.recent()).transpose(Math.random() > 0.5 ? -12 : -24),
        "8n",
        undefined,
        1
      )
      firstNote = false
    }

    if (enableHighQualityAudio) {
      if (velocity > 0.25) {
        synth.triggerAttackRelease(
          Tone.Frequency(seq.recent()).transpose(Math.random() > 0.5 ? +12 : 0),
          "32n",
          undefined,
          velocity)
        
        synth.triggerAttackRelease(
          Tone.Frequency(seq.recent()).transpose(velocity > 0.4 ? +12 : 0),
          "16n",
          undefined,
          velocity * 0.5
        )
      }
    }

    shouldTrigger = false
  }

  const triggerChange = () => {
    lastChangeAt = Date.now()
    shouldTrigger = true
  }

  return {
    start,
    stop,
    trigger,
    triggerChange
  }
}
