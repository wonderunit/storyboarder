// npx electron-mocha --require esm -w -R min --renderer test/shot-generator/services/filepaths.renderer.test.js

const assert = require('assert')

const {
  createPresetPathResolver,
  createAssetPathResolver
} = require('../../../src/js/shot-generator/services/filepaths')

const USER_DATA_DIR = 'USER_DATA_DIR'
const APP_DIR = 'APP_DIR'
const PROJECT_FILE_PATH = 'PROJECT_DIR/FILENAME.storyboarder'

describe('filepaths', function () {
  describe('getPresetPath', () => {
    const getPresetPath = createPresetPathResolver(USER_DATA_DIR)

    it('can get preset file paths', () => {
      assert.strictEqual(
        getPresetPath('emotions', 'emotions-none.png'),
        'USER_DATA_DIR/presets/emotions/emotions-none.png'
      )
    })
    it('can get preset directory paths', () => {
      assert.strictEqual(
        getPresetPath('emotions'),
        'USER_DATA_DIR/presets/emotions'
      )
    })
  })
  describe('getAssetPath', () => {
    const getAssetPath = createAssetPathResolver(APP_DIR, PROJECT_FILE_PATH)

    it('can get system and user file paths', () => {
      // TODO test hand poses

      assert.strictEqual(
        getAssetPath('attachable', 'model.glb'),
        'APP_DIR/data/shot-generator/attachables/model.glb'
      )
      assert.strictEqual(
        getAssetPath('attachable', 'models/attachments/model.glb'),
        'PROJECT_DIR/models/attachables/models/attachments/model.glb'
      )
    })
    it('can get system and user directory paths', () => {
      assert.strictEqual(
        getAssetPath('attachable'),
        'APP_DIR/data/shot-generator/attachables'
      )
      assert.strictEqual(
        getAssetPath('attachable', 'models/attachments'),
        'PROJECT_DIR/models/attachables/models/attachments'
      )
    })
  })
})
