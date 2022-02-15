const remote = require('@electron/remote')

const Tone = require('tone')
const { shuffle } = require('./utils/index')
const prefsModule = require('@electron/remote').require('./prefs')

Tone.Transport.latencyHint = 'playback'
Tone.Transport.start("+0.1")

let enableUISoundEffects
let enableHighQualityAudio

const getPrefs = () => {
  enableUISoundEffects = prefsModule.getPrefs('enableUISoundEffects')['enableUISoundEffects']
  enableHighQualityAudio = prefsModule.getPrefs('enableHighQualityAudio')['enableHighQualityAudio']
}

const getEnableUISoundEffects = () => enableUISoundEffects 

const getEnableHighQualityAudio = () => enableHighQualityAudio

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

let isMuted = false
const setMute = value => isMuted = value

// set up sound sources.
let synth
let bassSynth
let bassSynth2
let errorSynth
let bipSynth
let metalSynth
let comp
let comp2
let filter
let filter2
let filter3
let vol
let vol2

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
  if (!getEnableUISoundEffects()) return

  let note = chords[currentChord][currentNote % (chords[0].length)]
  let bassnote = chords[currentChord][0]
  let onote = chords2[currentChord][currentNote % (chords[0].length)]
  synth.triggerAttackRelease(Tone.Frequency(note).transpose(+12), "16n", undefined, 0.03);
  if (currentNote == 0) {
    bassSynth2.triggerAttackRelease(Tone.Frequency(note).transpose(+12*1), "8n", undefined, 0.03);
  }
  synth.triggerAttackRelease(Tone.Frequency(onote).transpose(+24), "16n", undefined, 0.05);
  advanceNote(1)
}

let down = (octaveShift, noteOffset) => {
  if (!getEnableUISoundEffects()) return

  if (!octaveShift) {
    octaveShift = 0
  }
  if (!noteOffset) {
    noteOffset = 0
  }

  let bassnote = chords[currentChord][0]
  let highnote = chords[currentChord][noteOffset]
  // console.log(Tone.Frequency(highnote).transpose(12*octaveShift))
  bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose(-12*3), "16n", undefined, 0.2);
  synth.triggerAttackRelease(Tone.Frequency(highnote).transpose(12*octaveShift).transpose(24), "16n", undefined,  0.2);
  advanceNote(1) 
}

let negative = () => {
  if (!getEnableUISoundEffects()) return

  let highnote = chords[currentChord][3]
  let bassnote = chords[currentChord][0]
  bassSynth.triggerAttackRelease(Tone.Frequency(highnote).transpose((-12*3)), 0.2, undefined, 0.2);
  synth.triggerAttackRelease(Tone.Frequency(highnote).transpose((+12*2)), "16n", undefined, 0.4);
  setTimeout(()=>{
    bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*3)), 0.2, undefined, 0.2);
    synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((+12*2)), "16n", undefined, 0.4);
  }, 150)
  advanceNote(1) 
}

let positive = () => {
  if (!getEnableUISoundEffects()) return

  let bassnote = chords[currentChord][0]
  bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose(-12*3), 0.2, undefined, 0.4);
  synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose(+12*2), "16n", undefined, .2);

  setTimeout(()=>{
    synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((+12*2)+5), "64n", undefined, 0.4);
    bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*2)), 0.2, undefined, 0.2);
  }, 150)

  setTimeout(()=>{
    synth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((+12*3)), "16n", undefined, 0.3);
  }, 300)
  advanceNote(1) 
}

let error = () => {
  if (!getEnableUISoundEffects()) return

  let bassnote = chords[currentChord][0]
    bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*2)), 0.1, undefined, 0.2);
    errorSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*2)), "64n", undefined, 0.2);
  setTimeout(()=>{
    bassSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*3)), 0.1, undefined, 0.2);
    errorSynth.triggerAttackRelease(Tone.Frequency(bassnote).transpose((-12*3)), "64n", undefined, 0.2);
  }, 150)
  advanceNote(1) 
}

let bip = (note) => {
  if (!getEnableUISoundEffects()) return

  bipSynth.triggerAttackRelease(Tone.Frequency(note).transpose(-12), "16n", undefined, 0.25)
  advanceNote(1)
}

// counter tick ALWAYS plays (even if UI sound effects are off)
let counterTick = () => {
  bipSynth.envelope.set({
    attack: 0.0001,
    decay: 0.2,
    sustain: 1,
    release: 0.6
  }).triggerAttackRelease(
    Tone.Frequency('c5')
  )
}

const filePathsForSoundEffects = {
  "trash": "./snd/trash.wav"
}
let multiPlayer
const init = () => {
  getPrefs()

  // always create bipSynth, which is used by counterTick
  bipSynth = new Tone.MonoSynth()
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

  if (!getEnableUISoundEffects()) return

  synth = new Tone.PolySynth(getEnableHighQualityAudio() ? 8 : 4, Tone.Synth)
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

  bassSynth = new Tone.PolySynth(3, Tone.FMSynth)
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

  bassSynth2 = new Tone.PolySynth(3, Tone.Synth)
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

  errorSynth = new Tone.PolySynth(3, Tone.Synth)
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

  metalSynth = new Tone.MetalSynth()
      .set({
        'frequency': 110,
        'envelope': {
          'decay': 0.125,
          'release': 0.05
        },
        'volume': -28
      })
      .toMaster()

  // set up effects and chain them.
  // var freeverb = new Tone.Freeverb(0.9, 1000) // unused
  comp = new Tone.Compressor(-10, 5)
  comp2 = new Tone.Compressor(-10, 5)
  filter = new Tone.Filter(100, "lowpass", -48)
  filter.set('Q', 2)
  filter2 = new Tone.Filter(1250, "lowpass", -12)
  filter2.set('Q', 2)
  filter3 = new Tone.Filter(10, "lowpass", -48)
  filter3.set('Q', 2)
  vol = new Tone.Volume(-24);
  vol2 = new Tone.Volume(-46);

  synth.chain(comp, filter2, vol, Tone.Master)
  bassSynth.chain( filter, comp2, Tone.Master)
  bassSynth2.chain( filter3,vol2, Tone.Master)

  multiPlayer = new Tone.Players(filePathsForSoundEffects)
                .set('volume', -20)
                .toMaster()
}
// route for sound effects by name/purpose
const playEffect = effect => {
  if (!getEnableUISoundEffects()) return
  if (isMuted) return

  switch (effect) {
    case 'fill':
      rollover()
      setTimeout(positive, 150)
      break
    case 'tool-light-pencil':
      down(-2,3)
      break
    case 'tool-pencil':
      down(-1)
      break
    case 'tool-pen':
      down(0)
      break
    case 'tool-brush':
      down(1)
      break
    case 'tool-note-pen':
      down(0,3)
      break
    case 'tool-eraser':
      down(-3)
      break
    case 'on':
      metalSynth.set({ 'frequency': 220 })
      metalSynth.triggerAttackRelease()
      break
    case 'off':
      metalSynth.set({ 'frequency': 110 })
      metalSynth.triggerAttackRelease()
      break
    case 'metal':
      metalSynth.set({ 'frequency': 880 })
      metalSynth.triggerAttackRelease()
      break
    case 'brush-size-up':
      metalSynth.set({ 'frequency': 880*1.4 })
      metalSynth.triggerAttackRelease()
      break
    case 'brush-size-down':
      metalSynth.set({ 'frequency': 880*1.2 })
      metalSynth.triggerAttackRelease()
      break
    default:
      if (multiPlayer) {
        if (multiPlayer.has(effect)) {
          let player = multiPlayer.get(effect)
          // stop if playing
          if (player.state === 'started') {
            multiPlayer.get(effect).stop()
          }
          multiPlayer.get(effect).start()
        }
      }
      break
  }
}

module.exports = {
  init,
  rollover,
  down,
  positive,
  negative,
  error,
  bip,
  counterTick,
  playEffect,
  
  setMute
}
