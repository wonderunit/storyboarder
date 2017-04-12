/*
  shorten bass - higher octave?
  bass high should be louder

  play a sequence for:
    opening
    new board
    import
    present
    tooltip

  new chord sequences
*/

const Tone = require('tone')
const { shuffle } = require('./utils/index.js')

Tone.Transport.latencyHint = 'playback'
Tone.Transport.start("+0.1")

let chords = [
  ['a4', 'b4', 'c5', 'e5'],
  ['g4', 'a4', 'b4', 'd5'],
  ['f4', 'g4', 'a4', 'c5'],
  ['b4', 'd5', 'e5', 'g#5'],
  ['c5', 'f5', 'g5', 'a5'],
  ['b4', 'e5', 'f#5', 'g#5'],
  ['c5', 'f5', 'g5', 'a5'],
  ['e5', 'g#5', 'b5', 'e6'],
]

let chords2 = JSON.parse(JSON.stringify(chords))
for (var i = 0; i < chords2.length; i++) {
  chords2[i] = shuffle(chords2[i])
}

let currentChord = 0
let chordCount = 0
let currentNote = 0

// set up sound sources.

var synth = new Tone.PolySynth(10, Tone.Synth)
synth.set({
  "oscillator" : {
    "type" : "square2"
 },
 "envelope" : {
    "attack":0.01,
    "decay":0.01,
    "sustain":1,
    "release":3.5,
 },
})

var bassSynth = new Tone.PolySynth(10, Tone.FMSynth)
bassSynth.set({
  "harmonicity":3,
  "modulationIndex":20,
  "detune":0,
  "oscillator":{
  "type":"square",
  },
  "envelope":{
  "attack":0.01,
  "decay":0.01,
  "sustain":1,
  "release":.1,
  },
  "moduation":{
  "type":"sawtooth",
  },
  "modulationEnvelope":{
  "attack":0.5,
  "decay":0,
  "sustain":1,
  "release":0.5,
}})
bassSynth.set('volume', -6)

var bassSynth2 = new Tone.PolySynth(10, Tone.Synth)
bassSynth2.set({
  "oscillator" : {
    "type" : "sine"
 },
 "envelope" : {
    "attack":3,
    "decay":0.01,
    "sustain":0.1,
    "release":7,
 },
})
bassSynth2.set('volume', -12).toMaster()

var errorSynth = new Tone.PolySynth(10, Tone.Synth)
errorSynth.set({
  "oscillator" : {
    "type" : "sawtooth"
 },
 "envelope" : {
    "attack": 0.1,
    "decay": 0.01,
    "sustain": 0.1,
    "release": 0.5,
 },
})
errorSynth.set('volume', -2).toMaster()

var bipSynth = new Tone.MonoSynth()
  .set({
    oscillator : {
      type : 'square'
    },
    envelope : {
      attack: 0.01,
      decay: 0.1,
      sustain: 1,
      release: 0.5,
    },
    filter: {
      Q: 1
    },
    filterEnvelope: {
      attack: 0.3,
      decay: 0.5,
      sustain: 1,
      release: 0.5,
      baseFrequency: 800,
      exponent: 4
    }
  })
  .set('volume', -24)
  .toMaster()

// set up effects and chain them.
// var freeverb = new Tone.Freeverb(0.9, 1000) // unused
var comp = new Tone.Compressor(-10, 5)
var comp2 = new Tone.Compressor(-10, 5)
var filter = new Tone.Filter(100, "lowpass", -48)
filter.set('Q', 2)
var filter2 = new Tone.Filter(1250, "lowpass", -12)
filter2.set('Q', 2)
var filter3 = new Tone.Filter(10, "lowpass", -48)
filter3.set('Q', 2)
var vol = new Tone.Volume(-24);
var vol2 = new Tone.Volume(-46);

synth.chain(comp, filter2, vol, Tone.Master)
bassSynth.chain( filter, comp2, Tone.Master)
bassSynth2.chain( filter3,vol2, Tone.Master)

let advanceNote = (amount) => {
  currentNote+=amount
  if (currentNote > 3) {
    currentNote = 0
    chordCount++
    if (chordCount > 1) {
      chordCount = 0
      currentChord++
    }
    if (currentChord > (chords.length-1)) {
      currentChord = 0
    }
  }
}

let rollover = () => {
  let note = chords[currentChord][currentNote % (chords[0].length)]
  let bassnote = chords[currentChord][0]
  let onote = chords2[currentChord][currentNote % (chords[0].length)]
  synth.triggerAttackRelease(Tone.Frequency(note).transpose(+12), "16n", undefined, 0.05);
  if (currentNote == 0) {
    bassSynth2.triggerAttackRelease(Tone.Frequency(note).transpose(+12*1), "8n", undefined, 0.03);
  }
  synth.triggerAttackRelease(Tone.Frequency(onote).transpose(+24), "16n", undefined, 0.1);
  advanceNote(1)
}

let down = () => {
  let bassnote = chords[currentChord][0]
  bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose(-12*3), 0.2, undefined, 0.4);
  synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose(+12*2), "16n", undefined, 1);
  advanceNote(1) 
}

let negative = () => {
  let bassnote = chords[currentChord][0]
  bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*3)+5), 0.2, undefined, 0.3);
  synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((+12*2)+5), "16n", undefined, 0.9);
  setTimeout(()=>{
    bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*3)), 0.2, undefined, 0.3);
    synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((+12*2)), "16n", undefined, 0.9);
  }, 150)
  advanceNote(1) 
}

let positive = () => {
  let bassnote = chords[currentChord][0]
  bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose(-12*3), 0.2, undefined, 0.4);
  synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose(+12*2), "16n", undefined, 1);

  setTimeout(()=>{
    synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((+12*2)+5), "64n", undefined, 0.9);
    bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*2)), 0.2, undefined, 0.3);
  }, 150)

  setTimeout(()=>{
    synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((+12*3)), "16n", undefined, 0.9);
  }, 300)
  advanceNote(1) 
}

let error = () => {
  let bassnote = chords[currentChord][0]
    bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*2)), 0.1, undefined, 0.3);
    errorSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*2)), "64n", undefined, 0.3);
  setTimeout(()=>{
    bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*3)), 0.1, undefined, 0.3);
    errorSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*3)), "64n", undefined, 0.3);
  }, 150)
  advanceNote(1) 
}

let bip = (note) => {
  bipSynth.triggerAttackRelease(Tone.Frequency(note).transpose(-12), "16n", undefined, 0.25)
  advanceNote(1)
}

module.exports = {
  rollover: rollover,
  down: down,
  positive: positive,
  negative: negative,
  error: error,
  shuffle,
  bip
}
