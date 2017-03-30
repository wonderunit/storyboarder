/*
    x
    y

    pressure
    tilt
    angle

    eraser
    pointerType

    sW
    sH

    timestamp
*/
const loop = require('raf-loop')

const distance = (x1, y1, x2, y2) =>
  Math.hypot(x2 - x1, y2 - y1)

const createModel = () => ({
  speed: 0,
  avgSpeed: 0,

  accel: 0,

  totalDistance: 0,
  totalTime: 0,
  
  damping: 0.9
})

let engine
let stack
let model

const init = () => {
  engine = loop(step)
  stack = []
}

const start = () => {
  engine.start()
  stack = []
  model = createModel()
}

const stop = () => {
  engine.stop()
}

const trigger = event => stack.push(event)

let prev
const step = dt => {
  let frameSize = 1/60*1000 / dt

  // loop through events that happened since the last render
  while (stack.length) {
    let curr = stack.pop()

    if (prev) {
      // NOTE unscaled distance in pixels
      let d = distance(
        prev.x, prev.y,
        curr.x, curr.y
      )
      model.totalDistance += d
      model.speed = d

      model.accel += model.speed
    }

    prev = curr
  }

  model.avgSpeed = model.totalDistance / model.totalTime || 0

  model.accel *= frameSize * model.damping
  if (model.accel < 0.1) model.accel = 0

  model.totalTime += dt
}

module.exports = {
  init,
  start,
  stop,
  trigger
}
