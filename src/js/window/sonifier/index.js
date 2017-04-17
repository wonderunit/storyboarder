// TODO ping-pong loop sample
// TODO minimum note duration
// TODO scale accel by canvas size?

const Tone = require('tone')
const tonal = require('tonal')
const ease = require('eases')
const vec2 = require('gl-vec2')

const util = require('../../utils/index.js')
const Loop = require('../../utils/loop.js')

const BrushInstrument = require('./brush-instrument')

const degrees = 180 / Math.PI

const distance = (a, b) =>
  Math.hypot(b[0] - a[0], b[1] - a[1])

let size
let engine
let model

let prev
let curr
let bufferA = vec2.create(),
    bufferB = vec2.create()

let instrument

const createModel = () => ({
  isActive: false,
  isOnCanvas: false,

  accel: 0,
  damping: 0.2,
  isAccel: false,
  
  accelGain: 0,

  pressure: 0,
  pointerType: null,

  totalDistance: 0,
  totalTime: 0,
  avgSpeed: 0
})

const inBounds = (x, y, _size) => {
  return x >= 0 && y >= 0 && x <= _size[0] && y <= _size[1]
}

const init = dimensions => {
  model = createModel()
  setSize(dimensions)

  instrument = BrushInstrument({
    samplePath: './snd/drawing-loop.wav'
  })

  engine = new Loop(step)
  engine.start()
}

const setSize = dimensions => {
  size = [dimensions.width, dimensions.height]
}

const start = (x, y, pressure, pointerType) => {
  model = createModel()
  model.pointerType = pointerType
  prev = null
  curr = null
  model.isActive = true

  bufferA = vec2.fromValues(0, 0)
  bufferB = vec2.fromValues(0, 0)
  
  instrument.noteOn()
  trigger(x, y, pressure, pointerType)
  renderDirectionChange(x, y, 0)
}

const stop = () => {
  model.isActive = false
  model.isOnCanvas = false
  instrument.noteOff()
}

// NOTE curently c<x,y> are always absolute to canvas w/h (e.g.; 900 x 900 * aspectRatio)
const trigger = (x, y, pressure, pointerType) => {
  curr = [x, y]
  model.pressure = pressure

  // out-of-bounds check
  // let isOnCanvas = inBounds(curr[0], curr[0], size)
  // // has out-of-bounds changed?
  // if (model.isOnCanvas != isOnCanvas) {
  //   // register change
  //   model.isOnCanvas = isOnCanvas
  //   // update
  // }
  model.isOnCanvas = inBounds(curr[0], curr[0], size)

  let speed = prev ? distance(prev, curr) : 0
  model.accel += speed
  model.totalDistance += speed

  if (prev) {
    let diff = vec2.create()
    vec2.subtract(diff, prev, curr)
    vec2.add(bufferA, bufferA, diff)
    vec2.add(bufferB, bufferB, diff)
  }

  // 1/4th screen width
  let a = util.clamp(
    model.accel * (1 / size[0]) * 4,
    0,
    1
  )
  model.accelGain += a

  prev = curr
}

const step = dt => {
  let frameSize = ((1 / 60) * 1000) / dt

  if (model.isActive) {
    let amplitudeOfChange = distance(bufferA, bufferB)
    if (prev) {
      let angleA = Math.atan2(bufferA[1], bufferA[0])
      let angleB = Math.atan2(bufferB[1], bufferB[0])

      // http://stackoverflow.com/questions/1878907/the-smallest-difference-between-2-angles
      let diffInAngle = Math.atan2(Math.sin(angleA - angleB), Math.cos(angleA - angleB))

      if (Math.abs(diffInAngle * degrees) > 40) {
        renderDirectionChange(curr, amplitudeOfChange)
        // reset the buffer
        bufferA = vec2.fromValues(0, 0)
        bufferB = vec2.fromValues(0, 0)
      }
    }

    // let a
    // // if there is a drastic change, let it cut in and out
    // if (amplitudeOfChange / size[0] > 0.1) {
    //   a = Tone.prototype.equalPowerScale(
    //       util.clamp(
    //         amplitudeOfChange * scaleFactor / 2,
    //         0,
    //         1
    //       )
    //     )
    // // but for smooth movements, keep the amplitude steady
    // } else {
    //   a = 0.5
    // }
    // 
    // let v = (model.pointerType === 'pen')
    //   ? Tone.prototype.equalPowerScale(ease.expoIn(model.pressure)) * a
    //   : a
    // 
    // instrument.ugens.gain.gain.value = v * (model.isAccel ? 1 : 0)
  }

  // dampen
  vec2.scale(bufferA, bufferA, 0.07)
  vec2.scale(bufferB, bufferB, 0.98)

  model.accel *= frameSize * model.damping
  if (model.accel < 0.0001) model.accel = 0
  model.isAccel = model.accel != 0

  if (!model.isOnCanvas) {
    model.accelGain = 0
  } else {
    model.accelGain *= 0.2 * frameSize // dampen
  }
  instrument.setGain(model.accelGain)

  model.totalTime += dt
  model.avgSpeed = model.totalDistance / model.totalTime || 0
}

let warble = false
const renderDirectionChange = (p, amplitudeOfChange) => {
  let isFast = (amplitudeOfChange / size[0] > 0.25) ? true : false

  if (warble) {
    instrument.setWarble(warble, isFast)
  } else {
    instrument.setWarble(warble, isFast)
  }
  warble = !warble

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
