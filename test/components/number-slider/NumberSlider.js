// https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API

const { useState, useEffect } = React = require('react')
const h = require('../../../src/js/utils/h')

const defaultOnSetValue = value => {}

const defaultFormatter = value => value.toFixed(2)

const NumberSlider = ({
  label,
  value = 0,
  min = -10,
  max = 10,
  step = 0.01,
  onSetValue = defaultOnSetValue,
  formatter = defaultFormatter
}) => {
  const onChange = event => {
    onSetValue(parseFloat(event.target.value))
  }

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      document.activeElement.blur()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyDown)
    return function cleanup () {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyDown)
    }
  }, [])

  return h([
    'div.number-slider', [
      ['div.number-slider__label', label],
      ['input.number-slider__input', { type: 'range', onChange, min, max, step, value }],
      ['div.number-slider__value', formatter(value)]
    ]
  ])
}

module.exports = NumberSlider
