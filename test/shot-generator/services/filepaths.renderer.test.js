// npx electron-mocha --require esm -w -R min --renderer test/shot-generator/services/filepaths.renderer.test.js

// for testing windows-style paths:
//
//     npm install --save-dev mock-require
//
//     const mock = require('mock-require')
//     mock('path', require('path').win32)
//

const assert = require('assert')
const path = require('path')

const {
  createUserPresetPathResolver,
  createAssetPathResolver
} = require('../../../src/js/shot-generator/services/filepaths')

const USER_DATA_DIR = 'USER_DATA_DIR'
const APP_DIR = 'APP_DIR'
const PROJECT_FILE_PATH = 'PROJECT_DIR/FILENAME.storyboarder'

describe('filepaths', function () {
  describe('getUserPresetPath', () => {
    const getUserPresetPath = createUserPresetPathResolver(USER_DATA_DIR)

    it('can get user preset file paths', () => {
      assert.strictEqual(
        getUserPresetPath('emotions', 'texture.png'),
        path.normalize('USER_DATA_DIR/presets/emotions/texture.png')
      )
    })
    it('can get user preset directory paths', () => {
      assert.strictEqual(
        getUserPresetPath('emotions'),
        path.normalize('USER_DATA_DIR/presets/emotions')
      )
    })
  })
  describe('getAssetPath', () => {
    const getAssetPath = createAssetPathResolver(APP_DIR, PROJECT_FILE_PATH)

    it('can get system and user file paths', () => {
      // TODO test hand poses

      assert.strictEqual(
        getAssetPath('emotion', 'emotions-none.png'),
        path.normalize('APP_DIR/data/shot-generator/emotions/emotions-none.png')
      )
      assert.strictEqual(
        getAssetPath('attachable', 'model.glb'),
        path.normalize('APP_DIR/data/shot-generator/attachables/model.glb')
      )
      assert.strictEqual(
        getAssetPath('attachable', 'models/attachables/model.glb'),
        path.normalize('PROJECT_DIR/models/attachables/model.glb')
      )
      assert.strictEqual(
        getAssetPath('emotion', 'texture.png'),
        path.normalize('APP_DIR/data/shot-generator/emotions/texture.png')
      )
      assert.strictEqual(
        getAssetPath('emotion', 'models/emotions/texture.png'),
        path.normalize('PROJECT_DIR/models/emotions/texture.png')
      )
    })
    it('can get system and user directory paths', () => {
      assert.strictEqual(
        getAssetPath('attachable'),
        path.normalize('APP_DIR/data/shot-generator/attachables')
      )
      assert.strictEqual(
        getAssetPath('attachable', '/'),
        path.normalize('PROJECT_DIR/models/attachables')
      )
    })
    it('can get system image file path', () => {
      assert.strictEqual(
        getAssetPath('image', `placeholder.png`),
        'APP_DIR/data/shot-generator/images/placeholder.png'
      )
    })
    it('can get user image file path', () => {
      assert.strictEqual(
        getAssetPath('image', `models/images/texture.png`),
        'PROJECT_DIR/models/images/texture.png'
      )
    })
  })
})
