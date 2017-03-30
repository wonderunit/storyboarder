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

  totalDistance: 0,
  totalTime: 0
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
  // loop through events that happened since the last render
  while (stack.length) {
    let curr = stack.pop()

    if (prev) {
      let distanceInPct = distance(
        prev.x / prev.sW, prev.y / prev.sH,
        curr.x / curr.sW, curr.y / curr.sH
      )
      model.totalDistance += distanceInPct
    }

    prev = curr
  }

  model.speed = model.totalDistance / model.totalTime || 0

  model.totalTime += dt
}

module.exports = {
  init,
  start,
  stop,
  trigger
}
