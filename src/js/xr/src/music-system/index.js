import * as Tone from 'tone'

const sequences = require('./sequences.json')

let sampler
let isPlaying = false

function last (arr) {
  return arr[arr.length - 1]
}

function shuffle (arr) {
  let a = arr.slice(0)
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var temp = a[i]
    a[i] = a[j]
    a[j] = temp
  }
  return a
}

let bag = []
function getSequence () {
  if (bag.length === 0) bag = shuffle([...sequences])
  return bag.shift()
}

function playSequence () {
  console.log('---')
  let sequence = getSequence()
  let events = sequence.notes

  events.forEach(event => {
    let { name, time, duration, velocity } = event
    console.log(`\t${name} ${time} ${duration}`)
    sampler.triggerAttackRelease(name, duration, `+${time}`, velocity)
  })

  return last(events).time + last(events).duration
}

function trigger () {
  console.log('<br/>===')
  console.log('MusicSystem#trigger')
  let duration = playSequence()

  console.log('\tduration', duration * 1000)

  if (isPlaying) {

    let next = (duration * 1000) * 3

    if (Math.random() < 0.3) {
      console.log('\tresting …')
      next = Tone.Time('16m').toMilliseconds()
    }

    console.log(`- will trigger again in ${next} msecs`)
    setTimeout(trigger, next)
  }
}

function start () {
  console.log('MusicSystem#start')

  let next = Tone.Time('5m').toMilliseconds()

  console.log(`- scheduled first sequence at ${next} msecs`)

  isPlaying = true
  setTimeout(trigger, next)
}

function init ({ urlMap, audioContext, audioNode, onComplete }) {
  console.log('MusicSystem#init', audioContext, audioNode)

  Tone.setContext(audioContext)

  sampler = new Tone.Sampler(
    urlMap,
    onComplete
  ).chain(audioNode.getOutput())
  sampler.release = 4.0 // let reverb ring out
  sampler.volume.value = -6 // db

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
