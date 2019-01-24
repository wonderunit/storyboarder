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
  .number-slider {
    display: flex;
    flex-direction: row;
  }
  .number-slider__label {
    width: 50px;
  }
  .number-slider__input {
    flex: 1;
  }
  .number-slider__value {
    width: 40px;
  }
`))
document.head.appendChild(style)

const NumberSliderTest = () => {
  const [value, setValue] = useState(0)

  return React.createElement(NumberSlider, { label: 'Number', value, onSetValue: setValue })
}

ReactDOM.render(
  React.createElement('div', { style: { margin: 10 } }, [
    React.createElement(NumberSliderTest, { key: 'number-slider-test'} )
  ]),
  container
)
