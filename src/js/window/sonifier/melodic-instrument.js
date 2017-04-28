const Tone = require('tone')
const tonal = require('tonal')

const util = require('../../utils')

let scale = tonal.scale('G mixolydian pentatonic')

const Arpeggiator = (_list = []) => {
  let curr = 0
  let list = _list
  const next = () => {
    let index = ++curr % list.length
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
  const getRecent = () => list[curr % list.length]
  return {
    reset,
    next,

    setList,
    getIndex,
    getRecent
  }
}

module.exports = () => {
  let arpA = Arpeggiator()

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

  var synthVol = new Tone.Volume(-6)

  var bassSynth2Vol = new Tone.Volume(-6)

  var verb = new Tone.Freeverb(0.96, 1000)
              .set('wet', 0.25)

  synth.chain(synthFilter, synthVol, verb, Tone.Master)
  bassSynth2.chain(bassSynth2Vol, verb, Tone.Master)

  let lastChangeAt = null
  let shouldTrigger = false
  let firstNote = false
  let chordType

  const start = () => {
    lastChangeAt = Date.now()
    shouldTrigger = true

    firstNote = true

    // TODO markov chain instead of shuffle
    //      include octaves in markov instead of random assignment
    arpA.setList(util.shuffle(scale))
    arpA.reset()
  }

  const stop = () => {

  }

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
      let bnote = arpA.next() + (Math.random() > 0.5 ? '3' : '4')
      bassSynth2.triggerAttackRelease(Tone.Frequency(bnote), "8n", undefined, 1)
      firstNote = false
    }
    if (velocity > 0.25) {
      let tonic = arpA.getRecent() + (Math.random() > 0.5 ? '3' : '4')
      let chord = tonal.chord.get(chordType, tonic)

      // remove root
      chord.shift()

      let note = chord[0]
      let onote = util.sample(chord)

      synth.triggerAttackRelease(
        Tone.Frequency(note),
        "32n",
        undefined,
        velocity)

      synth.triggerAttackRelease(
        Tone.Frequency(onote).transpose(velocity > 0.4 ? +12 : 0),
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

    // new chord built from the most recent bass note
    chordType = 'M' // util.sample(['M', '11', 'Maj7', 'M69', 'Madd9'])
  }

  return {
    start,
    stop,
    trigger,
    triggerChange
  }
}
