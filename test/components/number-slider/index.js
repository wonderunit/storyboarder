// ELECTRON_DISABLE_SECURITY_WARNINGS=true npx floss -d -p index.js

const { useState } = React = require('react')
const ReactDOM = require('react-dom')
console.clear()

const NumberSlider = require('../../../src/js/shot-generator/NumberSlider')

const container = document.createElement('div')
document.body.appendChild(container)

const addLink = filepath => {
  var styles = document.createElement('link')
  styles.rel = 'stylesheet'
  styles.type = 'text/css'
  styles.href = filepath
  document.head.appendChild(styles)
}
addLink('../../../src/css/fonts.css')
addLink('../../../src/css/shot-generator.css')

let style = document.createElement('style')
style.type = 'text/css'
style.appendChild(document.createTextNode(`
  body > div {
    width: 300px;
  }
`))
document.head.appendChild(style)

const formatters = {
  p3: value => value.toFixed(3),
  degrees: value => value.toFixed(0) + '°',
  // formatter: value => feetAndInchesAsString(...metersAsFeetAndInches(sceneObject.height))
  percent: value => Math.round(value * 100).toString() + '%'
  // radToDeg: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
}

const NumberSliderTest = () => {
  const [number, setNumber] = useState(0)
  const [degree, setDegree] = useState(0)
  const [percent, setPercent] = useState(0)
  const [precise, setPrecise] = useState(0)

  return React.createElement('div', null, [
    React.createElement(NumberSlider, {
      key: 0,
      label: 'Number',
      value: number,
      onSetValue: setNumber
    }),
    React.createElement(NumberSlider, {
      key: 1,
      label: 'Degrees',
      value: degree,
      min: -180,
      max: 180,
      step: 1,
      onSetValue: setDegree,
      formatter: formatters.degrees,
      transform: (prev, delta, { min, max, step, fine }) => {
        // inc/dec
        let val = prev + delta * (step * (fine ? 0.01 : 1))
        // mod
        if (value > 180) { return value - 360 }
        if (value < -180) { return value + 360 }
        return value
      }
    }),
    React.createElement(NumberSlider, {
      key: 2,
      label: 'Percent',
      value: percent,
      min: 0,
      max: 1,
      step: 1/100,
      onSetValue: setPercent,
      formatter: formatters.percent
    }),
    React.createElement(NumberSlider, {
      key: 3,
      label: 'Precise',
      value: precise,
      min: 0,
      max: 1,
      step: 1/100,
      onSetValue: setPrecise,
      formatter: formatters.p3
    })
  ])
}

ReactDOM.render(
  React.createElement('div', { style: { margin: 10 } }, [
    React.createElement(NumberSliderTest, { key: 'number-slider-test'} )
  ]),
  container
)
