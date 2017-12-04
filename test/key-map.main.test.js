// NOTE just for testing, not integrated

const assert = require('assert')

const R = require('ramda')

const activeBindings = (keyMap, down, invertedKeyMap = R.invert(keyMap)) =>
  R.reject(R.isNil, 
    R.flatten(R.props(down, invertedKeyMap)))

describe('key bindings', () => {
  it('active', () => {
    // one entry per command, but multiple key shortcuts can trigger the same command
    const keyMap = {
      'workspace:reload': ['CmdOrCtrl+R'],
      'workspace:open-file': 'CmdOrCtrl+O',
      'drawing:move-mode': 'CmdOrCtrl',
      'drawing:scale-mode': 'CmdOrCtrl+Alt',
      'drawing:brush-size:inc': ']',
      'drawing:brush-size:dec': '[',
      'contextA:a': 'a',
      'contextB:a': 'a'
    }

    // helper function to determine what bindings apply to key
    const activeBindingsFor = down => activeBindings(keyMap, down)

    // can get one command associated with the key '['
    assert.deepEqual(activeBindingsFor(['[']), ['drawing:brush-size:dec'])

    // can get two commands associated with the key 'a'
    assert.deepEqual(activeBindingsFor(['a']), ['contextA:a', 'contextB:a'])

    // for key with no commands associated, returns an empty array
    assert.deepEqual(activeBindingsFor(['x']), [])
  })
  
  it('isActive', () => {
    // example: move mode
    // move mode is mapped to CmdOrCtrl
    let keyMap = { 'drawing:move-mode': 'CmdOrCtrl' }
    // keyboard state indicates CmdOrCtrl is down
    let down = ['CmdOrCtrl']

    // helper function to determine if binding is active
    const isActiveBinding = name => activeBindings(keyMap, down).includes(name)

    assert.equal(isActiveBinding('drawing:move-mode'), true)
  })

  it('benchmark', () => {
    // 6 simultaneous keys
    const down = new Array(6).fill(0).map(Math.random)
  
    // 500 key bindings
    const keyMap = R.fromPairs(
      R.zip(new Array(500).fill(0).map(Math.random), new Array(500).fill(0).map(Math.random))
    )
  
    // 1k checks
  
    // when not cached, ~ 220 ms
    console.time('not inverted')
    for (let i = 0; i < 1000; i++) {
      activeBindings(keyMap, down)
    }
    console.timeEnd('not inverted')
  
    // when cached, < 5 ms
    let invertedKeyMap = R.invert(keyMap)
    console.time('inverted')
    for (let i = 0; i < 1000; i++) {
      activeBindings(keyMap, down, invertedKeyMap)
    }
    console.timeEnd('inverted')
  })
})
