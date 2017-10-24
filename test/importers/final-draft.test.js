const fs = require('fs')
const path = require('path')
const assert = require('assert')

const finalDraftImporter = require('../../src/js/importers/final-draft')

const assertThrowsAsynchronously = async (test, error) => {
  try {
    await test()
  } catch (e) {
    if (!error || e instanceof error)
        return
  }
  throw new AssertionError("Missing rejection" + (error ? ` with ${error.name}` : ""))
}

describe('final-draft', () => {
  let data
  beforeEach(() => {
    data = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'final-draft', 'test.fdx'))
  })
  describe('importFdxData', () => {
    it('throws an error if data can not be parsed', async () => {
      assertThrowsAsynchronously(async () => await finalDraftImporter.importFdxData({}), Error)
    })
    it('can parse a script', async () => {
      let script = await finalDraftImporter.importFdxData(data)

      assert.equal(script[1].type, 'scene')
      assert.equal(script[1].script[0].time, 8400)
      assert.equal(script[1].script[0].duration, 2000)
      assert.equal(script[1].script[0].type, 'scene_padding')
      assert.equal(script[1].script[0].scene, '2')

      assert.equal(script[1].script[1].time, 10400)
      assert.equal(script[1].script[1].duration, 3900)
      assert.equal(script[1].script[1].type, 'action')
      assert.equal(script[1].script[1].scene, '2')
      assert(script[1].script[1].text.includes('Perched on the house’s front stair is HENRY MAST'))
    })
  })
})
