const { useState, useEffect, useRef } = React = require('react')
const h = require('../utils/h')

const NumberSlider = React.memo(({ label, value, onSetValue, min, max, step, formatter }) => {
  const [fine, setFine] = useState(false)

  min = min == null ? -10 : min
  max = max == null ? 10 : max
  step = step == null ? 0.01 : step

  const onChange = event => {
    event.preventDefault()
    if (fine) {
      let change = parseFloat(event.target.value) - value
      onSetValue(value + (change / 1000))
    } else {
      onSetValue(parseFloat(event.target.value))
    }
  }

  formatter = formatter != null
    ? formatter
    : value => value.toFixed(2)

  useEffect(() => {
    const onKeyDown = event => {
      setFine(event.altKey)
      if (event.key === 'Escape') {
        document.activeElement.blur()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyDown)
    return function cleanup () {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyDown)
    }
  }, [])

  return h([
    'div.number-slider', { style: { display: 'flex', flexDirection: 'row' } }, [
      ['div', { style: { width: 50 } }, label],
      ['input', { style: { flex: 1 }, type: 'range', onChange, min, max, step, value }],
      ['div', { style: { width: 40 } }, formatter(value)]
    ]
  ])
})

module.exports = NumberSlider
