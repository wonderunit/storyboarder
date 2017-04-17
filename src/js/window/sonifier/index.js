// TODO ping-pong loop sample
// TODO minimum note duration
// TODO scale accel by canvas size?

const Tone = require('tone')
const tonal = require('tonal')
const throttle = require('lodash.throttle')
const ease = require('eases')
const vec2 = require('gl-vec2')

const util = require('../../utils/index.js')
const Loop = require('../../utils/loop.js')

const BrushInstrument = require('./brush-instrument')

const degrees = 180 / Math.PI

const distance = (x1, y1, x2, y2) =>
  Math.hypot(x2 - x1, y2 - y1)

let size
let engine
let model

let prev
let curr
let bufferA = vec2.create(),
    bufferB = vec2.create()

let instrument

const createModel = () => ({
  avgSpeed: 0,

  accel: 0,

  pressure: 0,
  pointerType: null,

  totalDistance: 0,
  totalTime: 0,

  damping: 0.2,

  isActive: true,
  isAccel: false
})

const init = _size => {
  setSize(_size)

  instrument = BrushInstrument({ samplePath: './snd/drawing-loop.wav' })

  model = createModel()
  engine = new Loop(step)
  engine.start()
}

const setSize = _size => {
  size = _size
}

const start = (x, y, pressure, pointerType) => {
  model = createModel()
  model.pointerType = pointerType
  prev = null
  curr = null
  model.isActive = true
  instrument.start()

  bufferA = vec2.fromValues(0, 0)
  bufferB = vec2.fromValues(0, 0)
}

const stop = () => {
  model.isActive = false
  instrument.stop()
}

// c<x,y> are always absolute to canvas w/h (e.g.; 900x900 * aspectRatio)
const trigger = c => {
  curr = c
  model.pressure = curr.pressure

  let speed = prev ? distance(prev.x, prev.y, curr.x, curr.y) : 0
  model.accel += speed
  model.totalDistance += speed

  if (prev) {
    let diff = [prev.x - curr.x, prev.y - curr.y]
    vec2.add(bufferA, bufferA, diff)
    vec2.add(bufferB, bufferB, diff)
  }

  instrument.note({ velocity: model.accel })

  prev = curr
}

const step = dt => {
  let frameSize = ((1 / 60) * 1000) / dt

  // dampen
  vec2.scale(bufferA, bufferA, 0.07)
  vec2.scale(bufferB, bufferB, 0.98)

  if (model.isActive) {
    let amplitudeOfChange = distance(bufferA[0], bufferA[1], bufferB[0], bufferB[1])
    if (prev) {
      let angleA = Math.atan2(bufferA[1], bufferA[0])
      let angleB = Math.atan2(bufferB[1], bufferB[0])
      // http://stackoverflow.com/questions/1878907/the-smallest-difference-between-2-angles
      let changeInAngle = Math.atan2(Math.sin(angleA - angleB), Math.cos(angleA - angleB))
      if (Math.abs(changeInAngle * degrees) > 40) {
        renderDirectionChange([curr.x, curr.y], amplitudeOfChange)
        bufferA = vec2.fromValues(0, 0)
        bufferB = vec2.fromValues(0, 0)
      }
    }

    // let a = util.clamp((model.accel / 100), 0.0, 1.0)
    let scaleFactor = 1 / size.width
    let a
    // if there is a drastic change, let it cut in and out
    if (amplitudeOfChange / size.width > 0.1) {
      a = Tone.prototype.equalPowerScale(
          util.clamp(
            amplitudeOfChange * scaleFactor / 2,
            0,
            1
          )
        )
    // but for smooth movements, keep the amplitude steady
    } else {
      a = 0.5
    }

    let v = (model.pointerType === 'pen')
      ? Tone.prototype.equalPowerScale(ease.expoIn(model.pressure)) * a
      : a

    instrument.ugens.gain.gain.value = v * (model.isAccel ? 1 : 0)

    // TODO smoothing on filterB frequency (stepped)
    // let f = 1000 + (model.accel * 20)
    // instrument.ugens.filterB.frequency.value = 
    //   util.clamp(
    //     f,
    //     0,
    //     22000
    //   )
  }

  model.accel *= frameSize * model.damping
  if (model.accel < 0.0001) model.accel = 0
  model.isAccel = model.accel != 0

  model.totalTime += dt
  model.avgSpeed = model.totalDistance / model.totalTime || 0
}

let dirChanges = 0
const renderDirectionChange = (p, amplitudeOfChange) => {
  let ramp = (amplitudeOfChange / size.width > 0.25) ? 0.05 : 1

  if (dirChanges % 2 == 0) {
    instrument.ugens.filterB.frequency.rampTo(6000, ramp)
  } else {
    instrument.ugens.filterB.frequency.rampTo(8000, ramp)
  }
  dirChanges += 1

  // uncomment to draw changes
  //
  // let canvas = document.querySelector('.sketchpane-painting-canvas')
  // context = canvas.getContext('2d')
  // context.beginPath()
  // context.fillStyle = '#f00'
  // context.arc(p[0], p[1], 5, 0, 2 * Math.PI);
  // context.fill()
  // context.closePath()
}

// TODO more use for distance calc

module.exports = {
  init,
  setSize,

  start,
  stop,
  trigger
}
