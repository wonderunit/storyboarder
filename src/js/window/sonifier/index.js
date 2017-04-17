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

  pressure: 0,
  pointerType: null,

  totalDistance: 0,
  totalTime: 0,
  avgSpeed: 0
})

const init = dimensions => {
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
}

const stop = () => {
  model.isActive = false
  model.isOnCanvas = false
}

const trigger = (x, y, pressure, pointerType) => {
  curr = [x, y]
  model.pressure = pressure

  let speed = prev ? distance(prev, curr) : 0
  model.accel += speed
  model.totalDistance += speed

  if (prev) {
    let diff = vec2.create()
    vec2.subtract(diff, prev, curr)
    vec2.add(bufferA, bufferA, diff)
    vec2.add(bufferB, bufferB, diff)
  }


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
        bufferA = vec2.fromValues(0, 0)
        bufferB = vec2.fromValues(0, 0)
      }
    }

  }

  model.accel *= frameSize * model.damping
  if (model.accel < 0.0001) model.accel = 0
  model.isAccel = model.accel != 0

  model.totalTime += dt
  model.avgSpeed = model.totalDistance / model.totalTime || 0
}

let dirChanges = 0
const renderDirectionChange = (p, amplitudeOfChange) => {

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
