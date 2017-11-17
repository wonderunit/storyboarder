// USAGE
// find src test | entr -c electron-mocha --renderer test/util/keytracker.test.js
//
// REFERENCE
// https://electronjs.org/docs/api/accelerator
// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values

const assert = require('assert')
const R = require('ramda')

const { pressed, isActive, convertElectronAccelerators, keyIndexed } = require('../../src/js/utils/keytracker')

const dispatch = (event = 'keydown', key) => {
  let e = new KeyboardEvent(
    event,
    {
      bubbles: true,
      cancelable: true,
      key
    }
  )
  window.dispatchEvent(e)
}

describe('keytracker', () => {
  it('knows when a key is pressed', () => {
    dispatch('keydown', 'q')
    assert(pressed('q'))
    assert(!pressed('Q'))
    dispatch('keyup', 'q')
  })

  it('knows when a combo is pressed', () => {
    assert(!pressed('CmdOrCtrl+r'))

    // -/-

    dispatch('keydown', 'Meta')
    dispatch('keydown', 'r')

    assert(pressed('CmdOrCtrl+r'))

    dispatch('keyup', 'Meta')
    dispatch('keyup', 'r')
    
    // -/-

    dispatch('keydown', 'Control')
    dispatch('keydown', 'r')

    assert(pressed('CmdOrCtrl+r'))

    dispatch('keyup', 'Control')
    dispatch('keyup', 'r')
  })

  it('can convert Electron Accelerator style bindings', () => {
    let keyBindings = {
      'reload': ['CommandOrControl+r']
    }

    let keyBindingsByKeyCombo = keyIndexed(convertElectronAccelerators(R.invert(keyBindings)))

    assert.deepEqual(keyBindingsByKeyCombo, [
      [['Command', 'r'], ['reload']],
      [['Control', 'r'], ['reload']]
    ])
  })

  it('knows when a binding is active, by name', () => {
    dispatch('keydown', 'Control')
    dispatch('keydown', 'r')
  
    let keyBindings = {
      'reload': ['CommandOrControl+r'],
      'up': ['ArrowUp']
    }
    let keyBindingsByKeyCombo = keyIndexed(convertElectronAccelerators(R.invert(keyBindings)))
    
    assert(isActive(keyBindingsByKeyCombo, 'reload'))
    assert(!isActive(keyBindingsByKeyCombo, 'up'))
  })
})
