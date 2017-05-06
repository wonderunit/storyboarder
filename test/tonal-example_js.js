global.TONE_SILENCE_VERSION_LOGGING = true

const Tone = require('tone')
const tonal = require('tonal')

global.Tone = Tone
global.tonal = tonal

const progression = ["Amadd9", "GMadd9", "Bm7#5", "FMadd9", "Am7",
  "Am7#5", "E7", "EMadd9", "G#m7#5", "EM", "Em#5"]

let synth = new Tone.PolySynth(8, Tone.Synth)
  .set({
    "oscillator" : {
      "type" : "triangle"
    },
    "envelope" : {
      "attack": 0.1,
      "decay": 0.1,
      "sustain": 0.5,
      "release": 0.1,
    },
  })
  .chain(
    new Tone.Filter(30, 'highpass', -48),
    new Tone.Freeverb().set({ wet: 0.1 }),
    new Tone.Filter(1000, 'lowpass', -24),
    new Tone.Limiter(-48),
    Tone.Master
  )

let curr = 0

const play = () => {
  let chord = progression[curr++ % progression.length]
  let root = tonal.chord(chord)[0]

  let intervals = tonal.chord.intervals(chord)
  let notes = intervals.map(n => tonal.transpose(n, root + '3'))

  for (let note of notes) {
    synth.triggerAttackRelease(
      Tone.Frequency(note), 
      "8n",
      undefined,
      1
    )
  }
}

//setInterval(play, 1000)
//play()
