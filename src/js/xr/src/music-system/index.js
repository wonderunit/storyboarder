const Tone = require('tone')

const sequences = require('./sequences.json')
const denylist = [0, 6, 7, 8, 11, 41, 42, 46, 51, 68, 72, 75, 91, 97, 101, 146, 154, 155, 156, 157, 158, 160, 161, 175, 178, 181, 182, 185, 187, 188, 189, 191, 193, 199, 202, 214, 215, 222, 228, 232]

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

function range (start, end) {
  let a = []
  for (let i = start; i <= end; i++) {
    a.push(i)
  }
  return a
}

let bag = []
function nextIndex () {
  if (bag.length === 0)
    bag = shuffle(
      range(0, sequences.length - 1).filter(i => !denylist.includes(i))
    )
  return bag.shift()
}

function choose (array) {
  return array[Math.floor(Math.random() * array.length)]
}

function playSequence (index) {
  index = index == null ? nextIndex() : index
  // console.log(`--- sequence index:${index}`)
  let sequence = sequences[index]
  let events = sequence.notes

  events.forEach(event => {
    let { name, time, duration, velocity } = event
    // console.log(`\t${name} t:${time} d:${duration} v:${velocity}`)
    sampler.triggerAttackRelease(name, duration, `+${time}`, velocity)
  })

  return last(events).time + last(events).duration
}

function trigger () {
  // console.log('<br/>===')
  // console.log('MusicSystem#trigger')
  let duration = playSequence()

  // console.log('\tduration', duration * 1000)

  if (isPlaying) {
    // schedule the next trigger
    // console.log('scheduling next trigger')

    // wait at least 3 x the duration of the previous sequence ...
    let next = (duration * 1000) * 3
    // console.log('base duration', next)

    // ... and add a variable number of measures of silence before playing ...
    let added = Tone.Time(choose(['4m', '8m', '16m'])).toMilliseconds() 
    // console.log('adding', added)
    next = next + added

    // 30% chance of resting 16 measures
    if (Math.random() < 0.3) {
      // console.log('\tresting …')
      next = Tone.Time('16m').toMilliseconds()
    }

    // console.log(`- will trigger again in ${next} msecs`)
    setTimeout(trigger, next)
  }
}

function start () {
  // console.log('MusicSystem#start')

  let next = Tone.Time('5m').toMilliseconds()

  // console.log(`- scheduled first sequence at ${next} msecs`)

  isPlaying = true
  setTimeout(trigger, next)
}

function init ({ urlMap, audioContext, audioNode, onComplete }) {
  // console.log('MusicSystem#init', audioContext, audioNode)

  Tone.setContext(audioContext)

  sampler = new Tone.Sampler(
    urlMap,
    onComplete
  ).chain(audioNode.getOutput())
  sampler.release = 4.0 // let reverb ring out
  sampler.volume.value = -22 // db

  return { sampler }
}

function setIsPlaying (value) {
  isPlaying = value
}

function getSequencesCount () {
  return sequences.length
}

module.exports = {
  init,
  start,
  playSequence,
  setIsPlaying,
  getSequencesCount
}
