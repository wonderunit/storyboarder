// USAGE budo index.js

const keytracker = require('../../../src/js/utils/keytracker')
const defaultKeyMap = require('../../../src/js/shared/helpers/defaultKeyMap')

const keymap = defaultKeyMap

const render = () => {
  let pressedKeys = keytracker.pressed()
  let matches = keytracker.findMatchingCommandsByKeys(keymap, pressedKeys)

  document.body.innerHTML = `
    <div style="padding: 7px 28px; font-size: 14px; font-family: monospace; line-height: 1.5;">
      <div>
        <h1>Key Tracker Test</h1>
        <p style="width: 30em;">Press key or combination of keys to see how they would be recognized by Storyboarder.</p>
      </div>
      <div>
        <strong>Pressed:</strong> <span>${pressedKeys.join('+')}</span>
      </div>
      <div>
        <strong>Matches:</strong> <span>${matches.join(', ')}</span>
      </div>
    </div>
  `
}

window.addEventListener('keydown', event => {
  render()
  event.preventDefault()
})

window.addEventListener('keyup', event => {
  render()
  event.preventDefault()
})

render()
