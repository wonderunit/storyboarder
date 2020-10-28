/*
# watch
find \
  test/shot-generator/extract-preset-data.test.renderer.js \
  src/js/shot-generator/services/presets.js \
  src/js/shared/reducers/shot-generator.js \
| entr -c \
npx electron-mocha \
--preload test/lib/setup-renderer.js \
--renderer \
test/shot-generator/extract-preset-data.test.renderer.js

# run once (if it hangs, try running interactively)
npx electron-mocha \
--preload test/lib/setup-renderer.js \
--renderer \
test/shot-generator/extract-preset-data.test.renderer.js

# run interactively (can't reload for some reason, have to quit and restart each time)
npx electron-mocha \
--interactive \
--preload test/lib/setup-renderer.js \
--renderer \
test/shot-generator/extract-preset-data.test.renderer.js

*/

'use strict'

const assert = require('assert')
const { app } = require('electron').remote
const fs = require('fs-extra')
const mockFs = require('mock-fs')
const path = require('path')
const { createStore, applyMiddleware } = require('redux')
const thunk = require('redux-thunk').default

const {
  initialState,
  reducer,
  loadScene,
  updateObject,
  getSerializedState
} = require('../../src/js/shared/reducers/shot-generator')

const {
  exportPresetFilesToProject
} = require('../../src/js/shot-generator/services/presets')

const presetsStorage = require('../../src/js/shared/store/presetsStorage')

const {
  createUserPresetPathResolver
} = require('../../src/js/shot-generator/services/filepaths')

const USER_DATA_DIR = app.getPath('userData')
const USER_PRESET_PATH = path.join(USER_DATA_DIR, 'presets')

const USER_EMOTIONS_FIXTURE = {
  'USER-EMOTION-PRESET': {
    id: 'USER-EMOTION-PRESET',
    name: 'sweet emotion',
    priority: 0
  }
}

const configureStore = () => createStore(
  reducer,
  {
    ...initialState,
    presets: {
      ...initialState.presets,
      emotions: {
        ...initialState.presets.emotions,
        ...presetsStorage.loadEmotionsPresets().emotions
      }
    }
  },
  applyMiddleware(thunk)

describe('presets', () => {
  let store
  let storyboarderFilePath = '/tmp/project/source.storyboarder'

  beforeEach(() => {
    mockFs({
      '/tmp': {
        'project': {
          'source.storyboarder': mockFs.load(
            path.join(
              __dirname, '..', 'fixtures', 'shot-generator', 'shot-generator.storyboarder'
            )
          )
        }
      },
      [USER_PRESET_PATH]: {
        'emotions.json': JSON.stringify(USER_EMOTIONS_FIXTURE),
        emotions: {
          'USER-EMOTION-PRESET-texture.png': mockFs.file(),
          'USER-EMOTION-PRESET-thumbnail.jpg': mockFs.file()
        }
      }
    })

    if (!store) {
      let data = JSON.parse(fs.readFileSync(storyboarderFilePath))
      data.boards[0].sg.data
        .sceneObjects['26332F12-28FE-444C-B73F-B3F90B8C62A2']
          .emotionPresetId = 'USER-EMOTION-PRESET'
      store = configureStore()
      store.dispatch(loadScene(data.boards[0].sg.data))
      store.dispatch({
        type: 'SET_META_STORYBOARDER_FILE_PATH',
        payload: storyboarderFilePath
      })
    }
  })

  it('can export metadata and files from system presets to project', () => {
    // prepare .storyboarder file contents
    let serialized = getSerializedState(store.getState())
    assert.strictEqual(serialized.presets.emotions.length, 1)
    assert.strictEqual(serialized.presets.emotions[0].metadata.name, 'sweet emotion')

    // export preset files to project folder
    //     store.dispatch(exportPresetsToProject(getUserPresetPath))
    const getUserPresetPath = createUserPresetPathResolver(USER_DATA_DIR)
    exportPresetFilesToProject(
      serialized.presets,
      path.dirname(storyboarderFilePath),
      getUserPresetPath
    )
    assert.strictEqual(fs.existsSync('/tmp/project/presets/emotions/USER-EMOTION-PRESET-texture.png'), true)
    assert.strictEqual(fs.existsSync('/tmp/project/presets/emotions/USER-EMOTION-PRESET-thumbnail.jpg'), true)
  })

  describe('getSerializedState', () => {
    it('includes presets by default', () => {
      assert.strictEqual(
        Object.values(getSerializedState(store.getState()).presets).length,
        1
      )
    })
    it('excludes presets if no user presets need to be exported', () => {
      let state = JSON.parse(JSON.stringify(store.getState()))
      // joker
      state.undoable.present.sceneObjects['26332F12-28FE-444C-B73F-B3F90B8C62A2']
        .emotionPresetId = '27934E27-CB0C-40EF-B72C-5A939DA3BFB3'
      assert.strictEqual(
        getSerializedState(state).presets,
        undefined
      )
    })
    it('can optionally exclude presets', () => {
      assert.strictEqual(
        Object.values(getSerializedState(store.getState(), { includePresets: false })).presets,
        undefined
      )
    })
  })

  afterEach(function () {
    mockFs.restore()
  })
})
