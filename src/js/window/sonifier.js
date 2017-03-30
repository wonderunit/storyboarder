const loop = require('raf-loop')

const distance = (x1, y1, x2, y2) =>
  Math.hypot(x2 - x1, y2 - y1)

let engine

let stack = []

let model = {
  speed: 0
}

const init = () => engine = loop(step)

const start = () => engine.start()

const stop = () => engine.stop()

const trigger = event => stack.push(event)

let prev
const step = dt => {
  while (stack.length) {
    let curr = stack.pop()

    if (prev) {
      model.speed = distance(prev.x, prev.y, curr.x, curr.y)
    }

    prev = curr
  }
}

module.exports = {
  init,
  start,
  stop,
  trigger
}
