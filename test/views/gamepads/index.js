const {
  addGamepad,
  removeGamepad
} = require('../../../src/js/xr/src/helpers/vr-gamepads')

const profile = require('../../../src/js/xr/src/helpers/vr-gamepads/oculus-touch-v2.json')

let controllers = []
const getController = index => {
  controllers[ index ] = controllers[ index ] || {
    userData: {},
    dispatchEvent: event => {
      console.log(event)
    }
  }
  return controllers[ index ]
}

function update (ts) {
  for (let i = 0; i < controllers.length; i++) {
    let controller = controllers[i]
    let gamepad = navigator.getGamepads()[controller.userData.inputSourceIndex]

    controller.userData.gamepadSource.emitter(gamepad)
  }
  requestAnimationFrame(update)
}

window.addEventListener('gamepadconnected', event => {
  console.log('gamepadconnected')

  let inputSourceIndex = [...navigator.getGamepads()].indexOf(event.gamepad)
  let inputSource = event
  inputSource.handedness = 'left'
  let controller = getController(inputSourceIndex)

  addGamepad(
    controller,
    inputSource,
    inputSourceIndex,
    {
      layout: profile.layouts[inputSource.handedness],
      threshold: 0.075
    }
  )
  console.log('controllers', controllers)
})

window.addEventListener('gamepaddisconnected', event => {
  console.log('gamepaddisconnected')

  let inputSourceIndex = event.gamepad.index
  let controller = getController(inputSourceIndex)

  removeGamepad(controller)

  controllers.splice(inputSourceIndex, 1)
  console.log('controllers', controllers)
})

update()
