// TODO ping-pong loop sample
// TODO minimum note duration
// TODO scale accel by canvas size?

const Tone = require('tone')
const tonal = require('tonal')

const throttle = require('lodash.throttle')

const util = require('../utils/index')

const Loop = require('../utils/loop')

const ease = require('eases')

const instrument = (() => {
  const pathToSample = "./snd/drawing-loop.wav"
  let sampler = new Tone.Player(pathToSample)
    .set('loop', true)
    .set('retrigger', true)
    .set('volume', -36)
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
    rolloff: -12,
    Q: 0
  })

  let gain = new Tone.Gain({ gain: 1 })

  sampler.chain(filterA, filterB, gain, Tone.Master)

  const start = () => {
    if (sampler.buffer.loaded) {
      const offset = Math.random() * sampler.buffer.duration

      sampler.reverse = false

      sampler.start(0, offset)
    } else {
      console.warn('sound has not loaded')
    }

    gain.gain.cancelScheduledValues()
    gain.gain.value = 0
  }

  const note = (opt = { velocity: 1 }) => {
    const { velocity } = opt
  }

  const stop = () => {
    gain.gain.cancelScheduledValues()
    gain.gain.rampTo(0, 0.01)
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
})()

const distance = (x1, y1, x2, y2) =>
  Math.hypot(x2 - x1, y2 - y1)

const createModel = () => ({
  avgSpeed: 0,

  accel: 0,

  pressure: 0,
  pointerType: null,

  totalDistance: 0,
  totalTime: 0,

  damping: 0.2,

  isMoving: false,
  isAccel: false
})

let engine
let model
let prev
let curr

const init = () => {
  engine = new Loop(step)

  model = createModel()

  engine.start()
}

const start = (x, y, pressure, pointerType) => {
  model = createModel()
  model.pointerType = pointerType
  prev = null
  curr = null
  instrument.start()
}

const stop = () => {
  instrument.stop()
}

const trigger = curr => {
  let speed = prev ? distance(prev.x, prev.y, curr.x, curr.y) : 0
  
  model.isMoving = speed > 0 ? true : false
  model.accel += speed

  model.pressure = curr.pressure

  instrument.note({ velocity: model.accel })

  prev = curr
}

const step = dt => {
  let frameSize = ((1 / 60) * 1000) / dt



  let wasAccel = model.isAccel
  model.isAccel = (model.accel > 0.1) ? true : false
  let changedAccel = model.isAccel != model.wasAccel
  if (changedAccel) {
    if (model.isAccel) {
      let v
      if (model.pointerType === 'pen') {
        // use pressure
        v = Tone.prototype.equalPowerScale(ease.expoIn(model.pressure))
      } else {
        // use accel
        v = util.clamp(
          Tone.prototype.equalPowerScale(ease.expoIn(model.accel / 50)),
          0.0,
          1.0
        )
      }

      instrument.ugens.gain.gain.cancelScheduledValues()
      instrument.ugens.gain.gain.rampTo(
        v,
        0.05)
          // instrument.ugens.gain.gain.value = v
      // instrument.ugens.filterB.frequency.value = 1000 + (v * 4000)
    } else {
          // instrument.ugens.gain.gain.value = 0
      instrument.ugens.gain.gain.cancelScheduledValues()
      instrument.ugens.gain.gain.rampTo(0, 0.1)

      // const v = util.clamp(model.accel / 100, 0.0, 1.0)
      // instrument.ugens.filterB.frequency.value = 1000 + (v * 4000)
    }
  }

  model.accel *= frameSize * model.damping
  if (model.accel < 0.0001) model.accel = 0

  model.totalTime += dt
  model.avgSpeed = model.totalDistance / model.totalTime || 0
}

module.exports = {
  init,
  start,
  stop,
  trigger
}
