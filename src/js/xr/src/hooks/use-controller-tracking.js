const THREE = require('three')
window.THREE = window.THREE || THREE

const { useRef } = React = require('react')
const { useRender } = require('react-three-fiber')

const { log } = require('../components/Log')

// via https://joe.framba.ch/blog/moving-average
class Stream {
  constructor(size) {
    this.size = size
    this.array = Array(size).fill(null)
    this.index = 0
    this.movingSum = 0
  }

  add(n) {
    this.array[this.index] = n
    this.index = (this.index + 1) % this.size
  }
}

function useControllerTracking (controllers, onDrum) {
  const clock = useRef()
  const getClock = () => {
    if (clock.current == null) {
      clock.current = new THREE.Clock()
    }
    return clock.current
  }

  const history = useRef()
  const getHistory = () => {
    if (history.current == null) {
      history.current = {}
    }
    return history.current
  }

  useRender((state, delta) => {
    let c = getClock()
    let h = getHistory()

    controllers.forEach(controller => {
      let gamepad = navigator.getGamepads()[controller.userData.gamepad.index]

      if (h[controller.uuid] == null) {
        h[controller.uuid] = {
          slow: new Stream(10),
          fast: new Stream(10),
          prevPosition: new THREE.Vector3(),
          prevRotation: new THREE.Euler()
        }
      }

      let position = controller.position
      let rotation = controller.rotation

      h[controller.uuid].fast.add({ position, rotation })

      if (c.getElapsedTime() > 0.25) {
        c.start()
        h[controller.uuid].slow.add({ position, rotation })
      }

      if (gamepad.hand === 'left') {
        log('---')
        log('left controller:')
        log(`${position.x.toPrecision(3)} ${position.y.toPrecision(3)}, ${position.z.toPrecision(3)}`)
        log(`${rotation.x.toPrecision(3)} ${rotation.y.toPrecision(3)}, ${rotation.z.toPrecision(3)}`)

        let prev = h[controller.uuid].prevPosition
        let diff = position.clone().sub(prev)
        log(`${diff.x} ${diff.y} ${diff.z}`)

        log('---')
      }

      h[controller.uuid].prevPosition = position.clone()
      h[controller.uuid].prevRotation = rotation.clone()
    })
  }, false, [controllers])
}

module.exports = useControllerTracking
