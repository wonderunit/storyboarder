/* global describe it  */

// npx floss -p test/shot-generator/reducers.test.main.js
// npx mocha -w -R min test/shot-generator/reducers.test.main.js

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const { createStore } = require('redux')

const { initialState, reducer, getSceneObjects } = require('../../src/js/shared/reducers/shot-generator')

const store = createStore(reducer)

describe('reducer', () => {
  describe('sceneObjects', () => {  
    it('has a displayName when name is undefined', () => {
      store.dispatch({ type: '@@redux-undo/INIT' })
  
      let state = store.getState()
      assert.equal(getSceneObjects(state)['6BC46A44-7965-43B5-B290-E3D2B9D15EEE'].displayName, 'Camera 1')
    })
  
    it('updates displayName of scene objects when a file is loaded', () => {
      store.dispatch({ type: '@@redux-undo/INIT' })
  
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

  describe('redux-undo', () => {
    it('can use groupBy to batch undo-able actions', () => {
      store.dispatch({ type: '@@redux-undo/INIT' })

      let json = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'shot-generator', 'shot-generator.storyboarder'))
      let data = JSON.parse(json)
      let payload = data.boards[0].sg.data
  
      store.dispatch({ type: 'LOAD_SCENE', payload })
      let state = store.getState()
  
      assert(state.sceneObjects.present)
      assert(Object.keys(state.attachments).length === 0)
      assert(state.meta.lastSavedHash.length)
      assert(state.activeCamera.present)
      assert(Object.keys(state.models).includes('adult-male'))
  
      store.dispatch({ type: 'CREATE_OBJECT', payload: {
        id: '0',
        type: 'object',
        model: 'box',
        width: 1,
        height: 1,
        depth: 1,
        x: 0,
        y: 0,
        z: 0,
        rotation: { x: 0, y: 0, z: 0 },
        visible: true
        }
      })
  
      assert.equal(2, store.getState().sceneObjects.past.length)
  
      // five related changes
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 1 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 2 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 3 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 4 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 5 } })
    
      assert(Object.values(store.getState().sceneObjects.past)[2]['0'].x === 0)
      assert(Object.values(store.getState().sceneObjects.present)['0'].x === 5)
    
      assert.equal(3, store.getState().sceneObjects.past.length)

      // still 3 past records if we make another change to the same object
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 6 } })
      assert.equal(3, store.getState().sceneObjects.past.length)

      // now, we change a different object
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '26332F12-28FE-444C-B73F-B3F90B8C62A2', x: 99 } })
      assert(store.getState().sceneObjects.present['26332F12-28FE-444C-B73F-B3F90B8C62A2'].x == 99)
      // should have another record in history
      assert.equal(4, store.getState().sceneObjects.past.length)
    })
  })
})
