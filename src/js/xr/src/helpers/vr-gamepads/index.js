const { map, pipe, skip, merge, filter } = require('callbag-basics')
const dropRepeats = require('callbag-drop-repeats')
const fromFunction = require('callbag-from-function').default
const subscribe = require('callbag-subscribe').default

const DEFAULT_THRESHOLD = 0.001

const createAxes = ({ threshold = DEFAULT_THRESHOLD } = {}) => {
  let { source, emitter } = fromFunction()

  let arrEq = (a, b) =>
    a[0] == b[0] &&
    a[1] == b[1] &&
    a[2] == b[2] &&
    a[3] == b[3]

  let resting = (a) =>
    Math.abs(a[0]) < threshold &&
    Math.abs(a[1]) < threshold &&
    Math.abs(a[2]) < threshold &&
    Math.abs(a[3]) < threshold

  let events = merge(
    pipe(
      source,
      map(resting),
      dropRepeats(),
      filter(isResting => isResting == false),
      map(() => (['axes', 0, 'start']))
    ),
    pipe(
      source,
      skip(1),
      dropRepeats(arrEq),
      filter(value => !resting(value)),
      map(value => (['axes', 0, 'change', value ]))
    ),
    pipe(
      source,
      map(resting),
      dropRepeats(),
      skip(1),
      filter(isResting => isResting == true),
      map(() => (['axes', 0, 'stop']))
    )
  )

  return { source: events, emitter }
}

const createButton = () => {
  let { source, emitter } = fromFunction()

  let events = merge(
    pipe(
      source,
      map(button => button.pressed),
      dropRepeats(),
      filter(pressed => pressed == true),
      map(pressed => (['button', 'start']))
    ),
    pipe(
      source,
      map(button => button.value),
      dropRepeats(),
      skip(1),
      map(value => ([ 'button', 'change', value ]))
    ),
    pipe(
      source,
      map(button => button.pressed),
      dropRepeats(),
      skip(1),
      filter(pressed => pressed == false),
      map(pressed => ([ 'button', 'stop' ]))
    ),
  )

  return { source: events, emitter }
}

const createGamepadSource = (gamepad, { threshold = DEFAULT_THRESHOLD } = {}) => {
  let axes = createAxes({ threshold })
  let buttons = gamepad.buttons.map(createButton)

  let emitter = gamepad => {
    axes.emitter(gamepad.axes)

    for (let i = 0; i < gamepad.buttons.length; i++) {
      buttons[i].emitter(gamepad.buttons[i])
    }
  }

  let source = merge(
    axes.source,
    ...buttons.map((button, n) => pipe(
      button.source,
      map(([source, ...rest]) => [source, n, ...rest])
    ))
  )

  return {
    emitter,
    source
  }
}

const toLayout = layout => ([source, index, ...rest]) => source === 'button'
  ? [source, layout.gamepad.buttons[index] ? layout.gamepad.buttons[index] : index, ...rest]
  : [source, index, ...rest]

const addGamepad = (controller, inputSource, inputSourceIndex, { layout, ...options }) => {
  controller.userData.inputSource = inputSource
  controller.userData.inputSourceIndex = inputSourceIndex

  let gamepadSource = createGamepadSource(inputSource.gamepad, options)

  let unsubscribe = pipe(
    gamepadSource.source,
    map(toLayout(layout)),
    subscribe(([source, index, type, payload]) => {
      if (index !== null) {
        let event = {
          type: `${source}/${index}/${type}`,
          ...(
            source === 'axes' && payload
              ? { axes: [payload[2], payload[3]] }
              : payload
                ? { value: payload }
                : {}
          )
        }
        // console.log(event)
        controller.dispatchEvent(event)
      }
    })
  )
  controller.userData.gamepadSource = gamepadSource
  controller.userData.gamepadSourceUnsubscribe = unsubscribe
}

const removeGamepad = controller => {
  controller.userData.gamepadSourceUnsubscribe && controller.userData.gamepadSourceUnsubscribe()
  controller.userData.inputSource = null
  controller.userData.inputSourceIndex = null
  controller.userData.gamepadSource = null
  controller.userData.gamepadSourceUnsubscribe = null
}

module.exports = {
  addGamepad,
  removeGamepad
}
