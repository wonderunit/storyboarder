/* global describe it  */

// npx floss -p test/shot-generator/reducers.test.main.js
// npx mocha -w -R min test/shot-generator/reducers.test.main.js

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const { createStore } = require('redux')

const { reducer, getSceneObjects } = require('../../src/js/shared/reducers/shot-generator')

const store = createStore(reducer)

describe('reducer', () => {
  describe('sceneObjects', () => {
    it('has a displayName when name is undefined', () => {
      let state = store.getState()
      assert.equal(getSceneObjects(state)['6BC46A44-7965-43B5-B290-E3D2B9D15EEE'].displayName, 'Camera 1')
    })
  
    it('updates displayName of scene objects when a file is loaded', () => {
      let json = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'shot-generator', 'shot-generator.storyboarder'))
      let data = JSON.parse(json)
      let payload = data.boards[0].sg.data
  
      store.dispatch({ type: 'LOAD_SCENE', payload })
      let state = store.getState()
      let sceneObjects = getSceneObjects(state)
  
      for (let id in sceneObjects) {
        assert(sceneObjects[id].displayName != null)
      }
  
      assert.equal(sceneObjects['6BC46A44-7965-43B5-B290-E3D2B9D15EEE'].displayName, 'Camera 1')
    })
  })
})
