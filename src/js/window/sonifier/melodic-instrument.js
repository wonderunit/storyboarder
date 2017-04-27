const Tone = require('tone')
const tonal = require('tonal')
const throttle = require('lodash.throttle')

const util = require('../../utils')

const chords = ["Amadd9", "GMadd9", "Bm7#5", "FMadd9", "Am7#5", "E7", "EMadd9", "G#m7#5", "EM", "Em#5"]

let getNotes = () => tonal.chord(util.sample(chords))

const Arpeggiator = onNext => {
  let curr = 0
  let list = []
  const next = () => {
    let index = ++curr % list.length
    // if (index == 0) {
    //   list = onNext()
    // }
    return list[index]
  }
  const reset = () => {
    curr = 0
  }
  const setList = (value) => {
    list = value
  }
  const getIndex = () => {
    return curr
  }

  list = onNext()
  return {
    reset,
    next,

    setList,
    getIndex
  }
}

module.exports = () => {

  let arp = Arpeggiator(getNotes)
  arp.reset()

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
        "attack": 4,
        "decay": 2,
        "sustain": 0.1,
        "release": 6,
      },
    })

  const synthFilter = new Tone.Filter(1250, "lowpass", -12)
    .set('Q', 0)

  var synthVol = new Tone.Volume(-12)

  var bassSynth2Vol = new Tone.Volume(-18)

  var verb = new Tone.Freeverb(0.96, 1000)
  verb.wet = 1

  synth.chain(synthFilter, synthVol, verb, Tone.Master)
  bassSynth2.chain(bassSynth2Vol, verb, Tone.Master)

  let lastChangeAt = null
  let shouldTrigger = false

  const start = () => {
    lastChangeAt = Date.now()
    shouldTrigger = true

    arp.setList(getNotes())
    arp.reset()
  }

  const stop = () => {

  }

  const trigger = (opt = { velocity: 1 }) => {
    const { velocity } = opt

    // been at least n msecs since last change
    if (!shouldTrigger &&
        lastChangeAt && 
        Date.now() - lastChangeAt > 1000)
    {
      lastChangeAt = Date.now()
      shouldTrigger = true
      //
      arp.reset()
    }

    if (!shouldTrigger) return

    let startingIndex = arp.getIndex()

    const note  = arp.next() + (Math.random() > 0.5 ? '3' : '4')
    const onote = arp.next() + (Math.random() > 0.5 ? '3' : '4')
    const bnote = arp.next() + (Math.random() > 0.5 ? '2' : '3')

    if (startingIndex == 0) {
      bassSynth2.triggerAttackRelease(Tone.Frequency(bnote).transpose(+12), "16n", undefined, 0.4)
    }
    if (velocity > 0.25) {
      synth.triggerAttackRelease(
        Tone.Frequency(note).transpose(+12),
        "32n",
        undefined,
        velocity)

      synth.triggerAttackRelease(Tone.Frequency(note).transpose(+12), "32n", undefined, velocity * 0.5)

      synth.triggerAttackRelease(Tone.Frequency(onote).transpose(+24), "16n", undefined, velocity * 0.5)
    }

    shouldTrigger = false
  }

  const triggerChange = () => {
    lastChangeAt = Date.now()
    shouldTrigger = true

    // arp.setList(getNotes())
    // arp.reset()
  }

  return {
    start,
    stop,
    trigger, //: throttle(trigger, 16 * 8),
    triggerChange
  }
}
