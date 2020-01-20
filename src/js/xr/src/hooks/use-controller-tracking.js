const THREE = require('three')
window.THREE = window.THREE || THREE

const { useRef } = React = require('react')
const { useRender } = require('react-three-fiber')

const { log } = require('../components/Log')

function useControllerTracking (controllers, onDrum) {

  useRender((state, delta) => {
    controllers.forEach(controller => {
      let gamepad = navigator.getGamepads()[controller.userData.gamepad.index]

      let pos = controller.position
      let rot = controller.rotation

      if (gamepad.hand === 'left') {
        log('---')
        log('left controller:')
        log(`${pos.x.toPrecision(3)} ${pos.y.toPrecision(3)}, ${pos.z.toPrecision(3)}`)
        log(`${rot.x.toPrecision(3)} ${rot.y.toPrecision(3)}, ${rot.z.toPrecision(3)}`)
        log('---')
        log('---')
      }
    })
  }, false, [controllers])
}

module.exports = useControllerTracking
