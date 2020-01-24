const THREE = require('three')
window.THREE = window.THREE || THREE

const { useRef } = React = require('react')
const { useRender } = require('react-three-fiber')

const { log } = require('../components/Log')
const { playDrum } = require('../music-system')

let THRESHOLD = 0.09

class Stream {
  constructor (size) {
    this.size = size
    this.array = Array(size).fill(null)
    this.index = 0
  }

  add (n) {
    this.array[this.index] = n
    this.index = (this.index + 1) % this.size
  }
}

function sum (a, b) { return a + b }

function min (acc, x) { return Math.min(acc, x) }

function useControllerTracking (controllers, onDrum) {
  const targets = useRef()
  const getTargets = () => {
    if (targets.current == null) {
      targets.current = {}
    }
    return targets.current
  }

  useRender((state, delta) => {
    controllers.forEach(controller => {
      if (getTargets()[controller.uuid] == null) {
        getTargets()[controller.uuid] = {
          controller,
          acc: new THREE.Vector3(),
          accD: new THREE.Vector3(),
          accF: new THREE.Vector3(),
          prev: null,
          stream: new Stream(30)
        }
      }

      let target = getTargets()[controller.uuid]

      if (target.prev) {
        let d = target.controller.position.clone().sub(target.prev)
        target.acc.add(d)
        target.accD.add(d)
        target.accF.add(d)

        let l = -Number.MAX_SAFE_INTEGER
        let c
        for (let i = 0; i < 3; i++) {
          if (target.accD.getComponent(i) > l) {
            l = target.accD[i]
            c = i
          }
        }
        let mc = target.accD.getComponent(c)
        let dc = d.getComponent(c)

        let signsEq = Math.sign(mc) == Math.sign(dc)

        let len = target.accD.length()

        if (len > THRESHOLD && !signsEq) {
          let { x, y, z } = target.controller.position
          target.stream.add({
            position: { x, y, z },
            delta
          })
          // get all recent events (from the past 500 msecs)
          let events = target.stream.array.filter(Boolean).filter(event =>
            (delta - event.delta) < 500
          )
          // if there are at least two to compare
          if (events.length >= 2) {
            // get the average recent Y position
            let yPos = events.map(event => event.position.y)
            let avgY = yPos.reduce(sum) / yPos.length

            // get the oldest recent event
            let deltas = events.map(event => event.delta)
            let oldestDelta = deltas.reduce(min, Infinity)
            let oldEvent = events.find(event => event.delta == oldestDelta)

            let oldDelta = oldEvent.delta
            let diffDelta = delta - oldDelta

            // let oldY = oldEvent.position.y
            // let diffY = y - oldY
            // if (diffDelta > 100 && diffY < -0.1) {

              log(`DRUM! ${Date.now()}`)

              playDrum()
            if (diffDelta > 100 && y - avgY < -0.025) {
            }
          }

          target.acc.set(0, 0, 0)
          target.accD.set(0, 0, 0)
          target.accF.set(0, 0, 0)
        }

        target.accD.multiplyScalar(0.98)
        target.accF.multiplyScalar(0.2)
      }

      target.prev = target.controller.position.clone()
    })
  }, false, [controllers])
}

module.exports = useControllerTracking
