/* global describe it  */

// npx floss -p test/shot-generator/reducers.test.main.js
// npx mocha --require esm -w -R min test/shot-generator/reducers.test.main.js

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const { createStore } = require('redux')

const {
  initialState,
  reducer,
  getSceneObjects,
  getWorld,
  getSerializedState
} = require('../../src/js/shared/reducers/shot-generator')

const serializeSceneObject = require('../../src/js/shared/reducers/shot-generator/serialize-scene-object')

const FILE_JSON = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'shot-generator', 'shot-generator.storyboarder'))

const store = createStore(reducer, initialState)

describe('serializeSceneObject', () => {
  it('serializes', () => {
    let object = {
      type: 'object',
      loaded: true
    }

    let characterWithSkeleton = {
      type: 'character',
      skeleton: {
        "Spine2": {
          "name": "Spine2",
          "position": {
            "x": 0.00167,
            "y": 1.22983,
            "z": -0.03056
          },
          "quaternion": {
            "w": 0.99882,
            "x": -0.04856,
            "y": 0,
            "z": 0
          },
          "rotation": {
            "x": -1.4830873294065141e-8,
            "y": -3.9092456260017476e-10,
            "z": -4.831679286872894e-10
          }
        },
        "mixamorigLeftArm": {
          "rotation": {
            "x": 1.00840734641021,
            "y": 0.008407346410207,
            "z": 0.108407346410207
          }
        }
      }
    }

    let characterWithoutSkeleton = {
      type: 'character'
    }

    let sObject = serializeSceneObject(object)
    assert(sObject.loaded === undefined)

    let sCwS = serializeSceneObject(characterWithSkeleton)
    assert(sCwS.loaded === undefined)
    assert(sCwS.skeleton !== null)
    assert(sCwS.skeleton.Spine2.quaternion === undefined)
    assert(sCwS.skeleton.Spine2.position === undefined)

    let sCwoS = serializeSceneObject(characterWithoutSkeleton)
    assert(sCwoS.loaded === undefined)
    assert(sCwoS.skeleton === undefined)
  })
})

describe('reducer', () => {
  describe('sceneObjects', () => {
    it('has a displayName when name is undefined', () => {
      store.dispatch({ type: '@@redux-undo/INIT' })
  
      let state = store.getState()
      assert.equal(getSceneObjects(state)['6BC46A44-7965-43B5-B290-E3D2B9D15EEE'].displayName, 'Camera 1')
    })
  
    it('updates displayName of scene objects when a file is loaded', () => {
      store.dispatch({ type: '@@redux-undo/INIT' })
  
      let data = JSON.parse(FILE_JSON)
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

  describe('checks', () => {
    it('marks if character properties have changed from character preset', () => {
      store.dispatch({ type: '@@redux-undo/INIT' })

      let characterPreset = {
        id: '12345',
        name: 'My Character',
        state: {
          height: 1.83,
          model: 'adult-male',
          name: 'Mr Character',

          morphTargets: {
            mesomorphic: 0,
            ectomorphic: 0,
            endomorphic: 0
          }
        },
      }

      store.dispatch({
        type: 'CREATE_CHARACTER_PRESET',
        payload: characterPreset
      })

      store.dispatch({
        type: 'CREATE_OBJECT',
        payload: {
          id: 'CHARACTER',
          type: 'character',
          model: 'adult-male',
          name: 'Mr Character',
          width: 1,
          height: 1.83,
          depth: 1,
          x: 0,
          y: 0,
          z: 0,
          rotation: 0,
          visible: true,
          characterPresetId: '12345',

          morphTargets: {
            mesomorphic: 0,
            ectomorphic: 0,
            endomorphic: 0
          }
        }
      })

      assert.equal(getSceneObjects(store.getState())['CHARACTER'].characterPresetId, '12345')
      assert.equal(getSceneObjects(store.getState())['CHARACTER'].height, 1.83)

      // if we dispatch an event which does not actually change anything ...
      store.dispatch({ type: 'UPDATE_OBJECT', payload: {
        id: 'CHARACTER',
        height: 1.83
      }})

      // ... we are still using the character preset
      assert.equal(getSceneObjects(store.getState())['CHARACTER'].characterPresetId, '12345')

      // if we CHANGE something ...
      store.dispatch({ type: 'UPDATE_OBJECT', payload: {
        id: 'CHARACTER',
        height: 1.7
      }})

      // the character preset is no longer a match, and clears out
      assert.equal(getSceneObjects(store.getState())['CHARACTER'].characterPresetId, null)
    })
  })

  describe('redux-undo', () => {
    beforeEach(() => {
      store.dispatch({ type: '@@redux-undo/INIT' })
      store.dispatch({ type: '@@redux-undo/CLEAR_HISTORY' })

      let data = JSON.parse(FILE_JSON)
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

  describe('migrations', () => {
    beforeEach(() => {
      store.dispatch({ type: '@@redux-undo/INIT' })
      store.dispatch({ type: '@@redux-undo/CLEAR_HISTORY' })
    })

    it('migrates old data to add required values', () => {
      let payload = JSON.parse(FILE_JSON).boards[0].sg.data
  
      delete payload.world.ambient
      delete payload.world.directional
      delete payload.world.fog

      store.dispatch({ type: 'LOAD_SCENE', payload })

      assert.notEqual(getWorld(store.getState()).ambient, null)
      assert.notEqual(getWorld(store.getState()).directional, null)
      assert.notEqual(getWorld(store.getState()).fog, null)
      assert.notEqual(getWorld(store.getState()).shadingMode, null)
    })
  })

  describe('shadingMode', () => {
    beforeEach(() => {
      store.dispatch({ type: '@@redux-undo/INIT' })
      store.dispatch({ type: '@@redux-undo/CLEAR_HISTORY' })
    })

    it('has default shadingMode', () => {
      assert.equal(getWorld(store.getState()).shadingMode, 'Outline')
    })

    it('can cycle through shadingMode values', () => {
      store.dispatch({ type: 'CYCLE_SHADING_MODE' })
      assert.equal(getWorld(store.getState()).shadingMode, 'Wireframe')

      store.dispatch({ type: 'CYCLE_SHADING_MODE' })
      assert.equal(getWorld(store.getState()).shadingMode, 'Flat')

      store.dispatch({ type: 'CYCLE_SHADING_MODE' })
      assert.equal(getWorld(store.getState()).shadingMode, 'Depth')

      store.dispatch({ type: 'CYCLE_SHADING_MODE' })
      assert.equal(getWorld(store.getState()).shadingMode, 'Outline')
    })    

    it('defaults to Outline if set shadingMode is null or invalid', () => {
      let payload = JSON.parse(FILE_JSON).boards[0].sg.data
  
      delete payload.world.shadingMode
      store.dispatch({ type: 'LOAD_SCENE', payload })

      assert(getWorld(store.getState()).shadingMode != null, 'shadingMode should have a default value')
      assert.equal(getWorld(store.getState()).shadingMode, 'Outline')
    })
  })

  describe('grayscale', () => {
    beforeEach(() => {
      store.dispatch({ type: '@@redux-undo/INIT' })
      store.dispatch({ type: '@@redux-undo/CLEAR_HISTORY' })
    })

    it('is present for new boards', () => {
      assert.equal(getWorld(store.getState()).environment.grayscale, true)
    })

    it('is added if missing', () => {
      let payload = JSON.parse(FILE_JSON).boards[0].sg.data
  
      delete payload.world.environment.grayscale
      store.dispatch({ type: 'LOAD_SCENE', payload })

      assert.equal(getWorld(store.getState()).environment.grayscale, false)
    })
  })

  describe('sceneObject .blocked', () => {
    it('is not saved to .storyboarder JSON file', () => {
      let cameraId = '6BC46A44-7965-43B5-B290-E3D2B9D15EEE'
      store.dispatch({ type: 'BLOCK_OBJECT', payload: cameraId })
      assert(getSceneObjects(store.getState())[cameraId].hasOwnProperty('blocked'))
      let saved = getSerializedState(store.getState())
      assert(saved.sceneObjects[cameraId].hasOwnProperty('blocked') === false, '.blocked should not be present')
    })
  })
})
