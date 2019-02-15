// npx electron-mocha --renderer test/shot-generator/model-loader.test.main.js
// npx floss -p test/shot-generator/model-loader.test.main.js

const assert = require('assert')

const ModelLoader = require('../../src/js/services/model-loader')

describe('ModelLoader', () => {
  describe('#isCustom', () => {
    it('knows if a model is custom', () => {
      assert.equal(true, ModelLoader.isCustomModel('models/character/adult-male.glb'))
      assert.equal(true, ModelLoader.isCustomModel('/path/to/models/character/adult-male.glb'))
    })
    it('knows if a model is built-in', () => {
      assert.equal(false, ModelLoader.isCustomModel('adult-male'))
    })
    it('throws an error for unexpected built-in model input', () => {
      assert.throws(
        // no extension, which would be expected for a built-in model
        // but with a path, which is only supposed to be for custom models
        () => ModelLoader.isCustomModel('models/character/adult-male')
      )
    })
    it('throws an error for unexpected custom model input', () => {
      assert.throws(
        // extension, which would be custom
        // but no relative or absolute path, which is unexpected
        () => ModelLoader.isCustomModel('adult-male.glb')
      )
    })
  })
})
