const Tone = require('tone')
const tonal = require('tonal')

const util = require('../../utils')

const progression = ["Amadd9", "GMadd9", "Bm7#5", "FMadd9", "Am7",
  "Am7#5", "E7", "EMadd9", "G#m7#5", "EM", "Em#5"]

const Sequence = (_list = []) => {
  let curr = 0
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
  let seq = Sequence(progression)

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
        "release": 2,
      },
    })

  const synthFilter = new Tone.Filter(1250, "lowpass", -12)
    .set('Q', 0)

  var synthVol = new Tone.Volume(-6)

  var bassSynth2Vol = new Tone.Volume(-6)

  var verb = new Tone.Freeverb(0.96, 1000)
              .set('wet', 0.1)

  synth.chain(synthFilter, synthVol, verb, Tone.Master)
  bassSynth2.chain(bassSynth2Vol, verb, Tone.Master)

  let lastChangeAt = null
  let shouldTrigger = false
  let firstNote = false

  const start = () => {
    lastChangeAt = Date.now()
    shouldTrigger = true

    firstNote = true
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
      firstNote = true
    }

    if (!shouldTrigger) return

    if (firstNote) {
      // get a new bass note
      seq.next()
    }
    
    let chord = seq.recent()
    let root = tonal.chord(chord)[0]
    let intervals = tonal.chord.intervals(chord)
    let notes = intervals.map(n => tonal.transpose(n, root + '3'))

    if (firstNote) {
      bassSynth2.triggerAttackRelease(
        Tone.Frequency(notes[0]),
        "8n",
        undefined,
        1
      )
      firstNote = false
    }
    if (velocity > 0.25) {
      notes.shift() // remove root
      let note1 = util.sample(notes)
      let note2 = util.sample(notes)
      
      synth.triggerAttackRelease(
        Tone.Frequency(note1).transpose(Math.random() > 0.5 ? +12 : 0),
        "32n",
        undefined,
        velocity)
      
      synth.triggerAttackRelease(
        Tone.Frequency(note2).transpose(velocity > 0.4 ? +12 : 0),
        "16n",
        undefined,
        velocity * 0.5
      )
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
