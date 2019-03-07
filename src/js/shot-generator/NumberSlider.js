const { useState, useEffect, useRef } = React = require('react')
const infixToPostfix = require('infix-to-postfix')
const postfixCalculator = require('postfix-calculator')
const h = require('../../../src/js/utils/h')

const defaultOnSetValue = value => {}

const transform = (prev, delta, { step, fine }) =>
  prev + delta * (step * (fine ? 0.01 : 1))

const clamp = (val, min, max) => val < min ? min : (val > max ? max : val)

const transforms = {
  // default
  clamp: (prev, delta, { min, max, step, fine }) => {
    // inc/dec
    let val = transform(prev, delta, { step, fine })
    // clamp
    val = clamp(val, min, max)
    return val
  },

  degrees: (prev, delta, { step, fine }) => {
    // inc/dec
    let value = transform(prev, delta, { step, fine })
    // mod
    if (value > 180) { return value - 360 }
    if (value < -180) { return value + 360 }
    return value
  },
  round: (prev, delta, { min, max, step, fine }) => {
    // inc/dec
    let value = transform(prev, delta, { step, fine })
    value = Math.round(value)
    value = clamp(value, min, max)
    return value
  }
}

const formatters = {
  // default
  toFixed2: value => value.toFixed(2),

  degrees: value => Math.round(value).toString() + '°',
  percent: value => Math.round(value).toString() + '%',  
}

const NumberSlider = ({
  label,
  value = 0,
  min = -10,
  max = 10,
  step = 0.1,
  onSetValue = defaultOnSetValue,
  formatter = formatters.toFixed2,
  transform = transforms.clamp
} = {}) => {
  const [moving, setMoving] = useState(false)
  const [textInput, setTextInput] = useState(false)
  const inputRef = useRef(null)
  const [textInputValue, setTextInputValue] = useState(null)
  const [altKey, setAltKey] = useState(false)

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      document.activeElement.blur()
    }
    setAltKey(event.altKey)
  }

  function lockChangeAlert () {
    // console.log(document.pointerLockElement)

    // if (document.pointerLockElement === ref)
    //   console.log('The pointer lock status is now locked');
    //   document.addEventListener("mousemove", updatePosition, false);
    // } else {
    //   console.log('The pointer lock status is now unlocked');
    //   document.removeEventListener("mousemove", updatePosition, false);
    // }
  }

  const onPointerDown = event => {
    event.preventDefault()
    if (event.shiftKey) {
      // reset
      // TODO validation
      onSetValue(0)
    } else {
      document.addEventListener('pointerup', onPointerUp)
      event.target.requestPointerLock()
      document.addEventListener('pointerlockchange', lockChangeAlert, false)
      setMoving(true)
    }
  }

  useEffect(() => {
    if (moving) {
      document.addEventListener('pointermove', onPointerMove)
    }
    return function cleanup () {
      document.removeEventListener('pointermove', onPointerMove)
    }
  }, [moving, value, altKey]) // rebind if values change that we care about

  useEffect(() => {
    if (!moving && !textInput) {
      document.activeElement.blur()
    }
  }, [moving, textInput])

  const onPointerMove = event => {
    onSetValue(transform(value, event.movementX, { min, max, step, fine: altKey }))
    event.preventDefault()
  }

  const onPointerUp = event => {
    setMoving(false)
    event.preventDefault()
    document.removeEventListener('pointerup', onPointerUp)
    document.exitPointerLock()
  }

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyDown)
    return function cleanup () {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (textInput) {
      inputRef.current.focus()
      setImmediate(() => {
        inputRef.current.select()
      })
    }
  }, [textInput])

  const onNudge = delta => event => {
    onSetValue(transform(value, delta, { min, max, step, fine: altKey }))
  }

  return h([
    'div.number-slider', [
      ['div.number-slider__label', label],
      ['div.number-slider__control', [
        ['div.number-slider__nudge.number-slider__nudge--left', { onClick: onNudge(-1) },
          ['.number-slider__arrow.number-slider__arrow--left']
        ],
        textInput
          ? ['input.number-slider__input.number-slider__input--text', {
              ref: inputRef,
              type: 'text',
              value: textInputValue,
              onChange: event => {
                event.preventDefault()
                setTextInputValue(event.target.value)
              },
              onKeyDown: event => {
                if (event.key === 'Escape') {
                  // reset
                  onSetValue(value)
                  setTextInput(false)
                }
                if (event.key === 'Enter') {
                  // TODO validation, error handling
                  onSetValue(postfixCalculator(infixToPostfix(event.target.value)))
                  setTextInput(false)
                }
              },
              onBlur: event => {
                setTextInput(false)
              }
            }]
          : ['input.number-slider__input.number-slider__input--move', {
              ref: inputRef,
              type: 'text',
              value: formatter(value),
              readOnly: true,
              onChange: event => onSetValue(parseFloat(event.target.value)),
              onPointerDown,
              onDoubleClick: () => {
                // TODO normalize
                // e.g.: for degrees, normalize 735d to 15d
                setTextInputValue(value)
                setTextInput(true)
              }
            }],
        ['div.number-slider__nudge.number-slider__nudge--right', { onClick: onNudge(1) },
          ['.number-slider__arrow.number-slider__arrow--right']
        ]
      ]]
    ]
  ])
}

module.exports = { NumberSlider, transforms, formatters }
