import * as Tone from 'tone'

// see https://github.com/Tonejs/Tone.js/wiki/Time
const timings = [
  ['+0:0:0', '+0:0:5', '+0:0:15', '+0:0:26'],
  ['+0:0:0', '+0:0:15', '+0:0:19', '+0:0:24'],
  ['+0:0:0', '+0:0:7'],
  ['+0:0:0', '+0:0:3'],
  ['+0:0:0']
]

const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const dissonant = ['A#', 'G#']

const octaves = [3, 4, 5]

let recurrence = [
  Tone.Time('7m').toMilliseconds(),
  Tone.Time('9m').toMilliseconds(),
  Tone.Time('11m').toMilliseconds()
]

let sampler
let shimmer
let reverb
let isPlaying = false

function choose(array, rand) {
  rand = rand || Math.random()
  return array[Math.floor(rand * array.length)]
}

function playSequence() {
  console.log('---')
  if (isPlaying) {
    let timing = choose(timings)
    timing.forEach((time, n) => {
      // convert to seconds
      time = Tone.Time(time).toSeconds()
      // slow down slightly over time
      time += n * 0.05
      // humanize
      time += (Math.random() * 2 - 1) * 0.05

      let allowed = [...notes]

      // after the first note, but before the last note
      // we can have little a dissonant note, as a treat
      if (
        n > 0 && n == timing.length - 1 - 1 ||
        n > 0 && n == timing.length - 1 - 2
      ) {
        allowed = [...allowed, ...allowed, ...dissonant]
        console.log(`allowing dissonant note for ${n} of ${timing.length}`)
      }

      let note = choose(allowed)
      let octave = choose(octaves, Math.pow(Math.random(), 2))
      let velocity = 0.3

      // humanize velocity
      velocity += (Math.random() * 2 - 1) * 0.05

      sampler.triggerAttackRelease(note + octave, '1n', time, velocity)

      console.log(`MusicSystem#playSequence ${n} triggerAR ${note + octave} 1n ${time} ${velocity}`)
    })
  }
}

function trigger () {
  console.log('<br/>===')
  console.log('MusicSystem#trigger')
  playSequence()

  if (isPlaying) {
    let next = choose(recurrence)
    console.log(`- will trigger again in ${next} msecs`)
    setTimeout(trigger, next)
  }
}

function start () {
  console.log('MusicSystem#start')

  isPlaying = true
  setTimeout(trigger, Tone.Time('9m').toMilliseconds())
}

function init ({ urlMap, audioContext, audioNode, onComplete }) {
  console.log('MusicSystem#init', audioContext, audioNode)

  Tone.setContext(audioContext)

  reverb = new Tone.Freeverb(0.95)
  reverb.wet.value = 0.15

  shimmer = new Tone.Chorus(1.5, 3.5, 0.3)

  sampler = new Tone.Sampler(
    urlMap,
    onComplete
  ).chain(shimmer, reverb, audioNode.getOutput())
  sampler.volume.value = -28 // db

  return { sampler }
}

function setIsPlaying (value) {
  isPlaying = value
}

export {
  init,
  start,
  playSequence,
  setIsPlaying
}
