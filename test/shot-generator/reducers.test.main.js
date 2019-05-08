/* global describe it  */

// npx floss -p test/shot-generator/reducers.test.main.js
// npx mocha -w -R min test/shot-generator/reducers.test.main.js

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const { createStore } = require('redux')

const { initialState, reducer, getSceneObjects } = require('../../src/js/shared/reducers/shot-generator')

const store = createStore(reducer, initialState)

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

    it('removes object from selection when object is deleted', () => {
      store.dispatch({ type: '@@redux-undo/INIT' })

      // create three more objects
      for (let i = 0; i < 3; i++) {
        store.dispatch({ type: 'CREATE_OBJECT', payload: {
          id: i.toString(),
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
      }

      // select one of the objects
      store.dispatch({ type: 'SELECT_OBJECT', payload: '0' })
      // now we have selections
      assert.equal(store.getState().undoable.present.selections.length, 1)
      assert.equal(store.getState().undoable.present.selections[0], '0')
      assert.equal(Object.values(getSceneObjects(store.getState())).length, 4)

      // if we delete two objects
      store.dispatch({ type: 'DELETE_OBJECTS', payload: { ids: ['0', '1'] }})

      // we have the original plus one we created
      assert.equal(Object.values(getSceneObjects(store.getState())).length, 2)
      // and selections has been cleared
      assert.equal(store.getState().undoable.present.selections.length, 0)
    })

    it('marks if character skeleton has changed from preset', () => {
      store.dispatch({ type: '@@redux-undo/INIT' })

      store.dispatch({
        type: 'CREATE_OBJECT',
        payload: {
          id: 'CHARACTER',
          type: 'character',
          model: 'adult-male',
          width: 1,
          height: 1,
          depth: 1,
          x: 0,
          y: 0,
          z: 0,
          rotation: 0,
          visible: true,
          posePresetId: '79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE',
          skeleton: {
            ...store.getState().presets.poses['79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE'].state.skeleton
          }
        }
      })

      // we're using a pose preset that exists in the presets list
      assert(
        store.getState().presets.poses[getSceneObjects(store.getState())['CHARACTER'].posePresetId] !== null
      )

      // if we dispatch an event which does not actually change rotation ...
      store.dispatch({ type: 'UPDATE_CHARACTER_SKELETON', payload: {
        id: 'CHARACTER',
        name: 'RightArm',
        rotation: getSceneObjects(store.getState())['CHARACTER'].skeleton.RightArm.rotation
      }})
      // ... we are still using the pose preset
      assert.equal(getSceneObjects(store.getState())['CHARACTER'].posePresetId, '79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE')

      // if we CHANGE the skeleton ...
      store.dispatch({ type: 'UPDATE_CHARACTER_SKELETON', payload: {
        id: 'CHARACTER',
        name: 'RightArm',
        rotation: {
          x: 0,
          y: 0,
          z: 0
        }
      }})
      // the pose preset is no longer a match, and clears out
      assert.equal(getSceneObjects(store.getState())['CHARACTER'].posePresetId, null)
    })
  })

  it('marks if character properties have changed from preset', () => {
    assert.fail('TODO')
  })

  describe('redux-undo', () => {
    beforeEach(() => {
      store.dispatch({ type: '@@redux-undo/INIT' })
      store.dispatch({ type: '@@redux-undo/CLEAR_HISTORY' })

      let json = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'shot-generator', 'shot-generator.storyboarder'))
      let data = JSON.parse(json)
      let payload = data.boards[0].sg.data
  
      store.dispatch({ type: 'LOAD_SCENE', payload })
    })

    it('sets up the store properly', () => {
      state = store.getState()

      assert(state.undoable.present.sceneObjects)
      assert(Object.keys(state.attachments).length === 0)
      assert(state.meta.lastSavedHash.length)
      assert(state.undoable.present.activeCamera)
      assert(Object.keys(state.models).includes('adult-male'))

      assert.equal(state.undoable.past.length, 1)
    })

    it('can batch related undo-able actions', () => {
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

      state = store.getState()
      assert.equal(state.undoable.past.length, 2)

      // five related changes
      store.dispatch({ type: 'UNDO_GROUP_START' })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 1 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 2 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 3 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 4 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 5 } })
    
      assert(store.getState().undoable.past[2].sceneObjects['0'].x === 0)
      assert(store.getState().undoable.present.sceneObjects['0'].x === 5)

      assert.equal(store.getState().undoable.past.length, 3)

      // still 3 past records if we make another change to the same object
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', x: 6 } })
      assert.equal(3, store.getState().undoable.past.length)
    
      store.dispatch({ type: 'UNDO_GROUP_END' })
    
      // now, we change a different object
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '26332F12-28FE-444C-B73F-B3F90B8C62A2', x: 99 } })
      assert(store.getState().undoable.present.sceneObjects['26332F12-28FE-444C-B73F-B3F90B8C62A2'].x == 99)
      // should have another record in history
      assert.equal(store.getState().undoable.past.length, 4)
    })

    it('changes to posePresetId get their own undo history', () => {
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
      assert.equal(store.getState().undoable.past.length, 2)

      // five undo-able pose preset changes
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', posePresetId: 0 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', posePresetId: 1 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', posePresetId: 2 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', posePresetId: 3 } })
      store.dispatch({ type: 'UPDATE_OBJECT', payload: { id: '0', posePresetId: 4 } })

      assert.equal(store.getState().undoable.past.length, 7)
    })
  })
})
