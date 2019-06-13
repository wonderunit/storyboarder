const { useState, useEffect, useRef, useContext } = React = require('react')
const ReactDOM = require('react-dom')

const h = require('../../../src/js/utils/h')

const TestUI = props => {
  const [state, setState] = useState({})
  useEffect(() => {
    require('../../../src/js/shot-generator/DualshockController')(setState)
  }, [])

  return h([
    'div', [
      ['h3', 'DualShock Controller'],

      ['div', { style: { display: 'flex' }}, [
        ['div', { style: { margin: '0 20px 0 0' }}, [
          ['h4', 'analog'],
          state.analog
            ? Object.entries(state.analog).map(([ key, value ]) =>
                value
                  ? ['div', `${key}: ${value}`]
                  : ['div', `${key}: ---`]
              )
            : null,
        ]],

        ['div', { style: { margin: '0 20px 0 0' }}, [
          ['h4', 'digital'],
          state.digital
            ? Object.entries(state.digital).map(([ key, value ]) =>
                ['div', `${key}: ${value}`]
              )
            : null,
        ]],

        ['div', { style: { margin: '0 20px 0 0' }}, [
          ['h4', 'motion'],
          state.motion
            ? Object.entries(state.motion).map(([ key, value ]) =>
                ['div', `${key}: ${value}`]
              )
            : null
        ]]
      ]]
    ]
  ])
}

ReactDOM.render(
  h([
    TestUI
  ]),
  document.getElementById('main')
)
