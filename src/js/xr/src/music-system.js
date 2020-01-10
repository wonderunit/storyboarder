import * as Tone from 'tone'

// see https://github.com/Tonejs/Tone.js/wiki/Time
const timings = [
  ['+0', '+3n', '+2n'],
  ['+0', '+4n', '+2n', '+1n'],
  ['+0', '+6n', '+3n'],
  ['+0:0:0', '+0:2:1', '+1:3:0'],
  ['+0:0:0', '+0:0:3', '+0:0:6', '+0:0:8', '+0:0:11', '+0:0:14', '+0:0:16']
]

const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

const octaves = [4, 5, 6]

let sampler
let reverb
let delay
let isPlaying = false

function choose(array, rand) {
  rand = rand || Math.random()
  return array[Math.floor(rand * array.length)]
}

function playSequence() {
  if (isPlaying) {
    let timing = choose(timings)
    timing.forEach((time, n) => {
      // convert to seconds
      time = Tone.Time(time).toSeconds()
      // slow down slightly over time
      time += n * 0.05
      // humanize
      time += (Math.random() * 2 - 1) * 0.05

      let note = choose(notes)
      let octave = choose(octaves, Math.pow(Math.random(), 2))
      let velocity = 0.3

      sampler.triggerAttackRelease(note + octave, '1n', time, velocity)

      console.log(`MusicSystem#playSequence triggerAR ${note + octave} 1n ${time} ${velocity}`)
    })
  }
}

function start () {
  console.log('MusicSystem#start')

  isPlaying = true
  // playSequence()
  setInterval(playSequence, Tone.Time('9m').toMilliseconds())
}

function init ({ urlMap, audioContext, audioNode }) {
  console.log('MusicSystem#init', audioContext, audioNode)

  Tone.setContext(audioContext)

  reverb = new Tone.Freeverb(0.9)
  delay = new Tone.FeedbackDelay(0.5, 0.6)

  sampler = new Tone.Sampler(
    urlMap,
    start
  ).chain(delay, reverb, audioNode.getOutput())
}

export {
  init
}
