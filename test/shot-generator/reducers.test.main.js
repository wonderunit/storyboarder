/* global describe it  */

// npx floss -p test/shot-generator/reducers.test.main.js

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const { createStore } = require('redux')

const r = require('../../src/js/shared/reducers/shot-generator')

const store = createStore(r.reducer)

describe('reducer', () => {
  describe('sceneObjects', () => {
    it('has a displayName when name is undefined', () => {
      let state = store.getState()
      assert.equal(state.sceneObjects['6BC46A44-7965-43B5-B290-E3D2B9D15EEE'].displayName, 'Camera 1')
    })

    it('updates displayName of scene objects when a file is loaded', () => {
      let json = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'shot-generator', 'shot-generator.storyboarder'))
      let data = JSON.parse(json)
      let payload = data.boards[0].sts.data

      store.dispatch({ type: 'LOAD_SCENE', payload })
      let state = store.getState()

      for (let id in state.sceneObjects) {
        assert(state.sceneObjects[id].displayName != null)
      }

      assert.equal(state.sceneObjects['6BC46A44-7965-43B5-B290-E3D2B9D15EEE'].displayName, 'Camera 1')
    })
  })
})


