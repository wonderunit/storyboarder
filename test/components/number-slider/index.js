// ELECTRON_DISABLE_SECURITY_WARNINGS=true npx floss -d -p index.js

const { useState } = React = require('react')
const ReactDOM = require('react-dom')
console.clear()

const NumberSlider = require('./NumberSlider')

const container = document.createElement('div')
document.body.appendChild(container)

let style = document.createElement('style')
style.type = 'text/css'
style.appendChild(document.createTextNode(`
  body {
    font-size: 12px;
    font-family: "Helvetica Neue";
  }
  body > div {
    width: 300px;
  }
  .number-slider {
    display: flex;
    flex-direction: row;
    margin-bottom: 0.5rem;
  }
  .number-slider__label {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    cursor: default;
    padding: 0 0.5rem 0 0;
    margin-top: -1px; /* optical */
  }
  .number-slider__input {
    flex: 1;
    cursor: col-resize;
    text-align: center;
    border: 0;
    outline: 0;
    padding: 6px;
  }
  .number-slider__input--text {
    background-color: yellow;
  }
  .number-slider__input--move {
    background-color: #eee;
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
      transform: (prev, delta, { min, max, step }) => {
        // inc/dec
        let value = prev + delta * step
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
