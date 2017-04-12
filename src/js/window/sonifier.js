// TODO ping-pong loop sample
// TODO minimum note duration
// TODO scale accel by canvas size?

const Tone = require('tone')
const tonal = require('tonal')

const throttle = require('lodash.throttle')

const util = require('../utils/index')

const Loop = require('../utils/loop')

const ease = require('eases')

const sfx = require('../wonderunit-sound.js')

const distance = (x1, y1, x2, y2) =>
  Math.hypot(x2 - x1, y2 - y1)

const angle = (x0, y0, x1, y1) =>
  Math.atan2(y1 - y0, x1 - x0)

const Instrument = () => {
  let sampler = samplers.drawing
    .set('loop', true)
    .set('retrigger', true)
    .set('volume', -12)
    .stop()
  
  let filterA = new Tone.Filter({
    type: "bandpass",
    frequency: 9000,
    rolloff: -24,
    Q: 1
  })

  let filterB = new Tone.Filter({
    type: "lowpass",
    frequency: 8000,
    rolloff: -48,
    Q: 1
  })

  let gain = new Tone.Gain({ gain: 1 })

  let amp = new Tone.Gain({ gain: 1 })
  let lfo = new Tone.LFO(1.25, 0.6, 1)
  lfo.connect(amp.gain).start()

  sampler.chain(filterA, gain, amp, Tone.Master)

  let filterSend = gain.send('filterB', -10)
  filterB.receive('filterB').toMaster()

  const start = () => {
    gain.gain.cancelScheduledValues()
    gain.gain.value = 0

    if (sampler.buffer.loaded) {
      const offset = Math.random() * sampler.buffer.duration

      sampler.reverse = false

      sampler.start(0, offset)
    } else {
      console.warn('sound has not loaded')
    }
  }

  const note = (opt = { velocity: 1 }) => {
    const { velocity } = opt
  }

  const stop = () => {
    gain.gain.cancelScheduledValues()
    gain.gain.rampTo(0, 0.01)
    sampler.stop()
  }
  
  return {
    start,
    stop,
    note,
    ugens: {
      gain,
      filterA,
      filterB
    }
  }
}

const createModel = () => ({
  avgSpeed: 0,

  accel: 0,

  pressure: 0,
  pointerType: null,

  prevAngle: 0,
  currAngle: 0,

  totalDistance: 0,
  totalTime: 0,

  damping: 0.2,

  isActive: true,
  isAccel: false
})

let engine
let model
let prev
let curr

let samplers
let instrument

const init = () => {
  samplers = {
    'drawing': new Tone.Player('./snd/drawing-loop.wav'),
    'trash': new Tone.Player('./snd/trash.wav').set('volume', -6).set({ retrigger: true }).toMaster()
  }
  instrument = Instrument()

  engine = new Loop(step)
  model = createModel()

  engine.start()
}

const start = (x, y, pressure, pointerType) => {
  model = createModel()
  model.pointerType = pointerType
  prev = null
  curr = null
  model.isActive = true
  instrument.start()
}

const stop = () => {
  model.isActive = false
  instrument.stop()
}

const trigger = curr => {
  model.pressure = curr.pressure

  let speed = prev ? distance(prev.x, prev.y, curr.x, curr.y) : 0
  model.accel += speed
  model.totalDistance += speed

  model.prevAngle = model.currAngle
  model.currAngle = prev ? angle(prev.x, prev.y, curr.x, curr.y) : 0

  let avgSpeedByFrame = model.avgSpeed * ((1 / 60) * 1000)

  instrument.note({ velocity: model.accel })

  prev = curr
}

const step = dt => {
  let frameSize = ((1 / 60) * 1000) / dt

  if (model.isActive) {
    let a = util.clamp((model.accel / 100), 0.0, 1.0)

    let v = (model.pointerType === 'pen')
      ? Tone.prototype.equalPowerScale(ease.expoIn(model.pressure)) * a
      : a

    instrument.ugens.gain.gain.value = v

    // TODO smoothing on filterB frequency (stepped)
    let f = 1000 + (model.accel * 20)
    instrument.ugens.filterB.frequency.value = 
      util.clamp(
        f,
        0,
        22000
      )
  }

  model.accel *= frameSize * model.damping
  if (model.accel < 0.0001) model.accel = 0

  model.totalTime += dt
  model.avgSpeed = model.totalDistance / model.totalTime || 0
}

const playEffect = effect => {
  switch (effect) {
    case 'fill':
      sfx.rollover()
      setTimeout(sfx.positive, 150)
      break
    case 'tool-light-pencil':
      sfx.bip('c4')
      break
    case 'tool-pencil':
      sfx.bip('e4')
      break
    case 'tool-pen':
      sfx.bip('b4')
      break
    case 'tool-brush':
      sfx.bip('c5')
      break
    case 'tool-note-pen':
      sfx.bip('e5')
      break
    case 'tool-eraser':
      sfx.bip('b5')
      break
    default:
      samplers[effect].start()
      break
  }
}

module.exports = {
  init,
  start,
  stop,
  trigger,
  playEffect
}
