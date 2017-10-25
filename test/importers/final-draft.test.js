const fs = require('fs')
const path = require('path')
const assert = require('assert')
const xml2js = require('xml2js')

const importerFinalDraft = require('../../src/js/importers/final-draft')

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
  let getFirstScene = fdxObj => fdxObj.FinalDraft.Content[0].Paragraph.find(e => e.$.Type === 'Scene Heading')

  let fdxObj
  beforeEach(async () => {
    fdxObj = await importerFinalDraft.readFdxFile(path.join(__dirname, '..', 'fixtures', 'final-draft', 'test.fdx'))
  })

  describe('insertSceneIds', () => {
    it('can insert scene ids', async () => {
      // intentionally remove the the first scene's number
      let firstSceneBefore = getFirstScene(fdxObj)
      delete firstSceneBefore.$.Number
      // ensure the number has been removed
      assert.equal(getFirstScene(fdxObj).$.Number, undefined)

      // insert scene ids
      importerFinalDraft.insertSceneIds(fdxObj)

      // ensure that the first scene now has a number
      let firstSceneAfter = getFirstScene(fdxObj)
      assert(getFirstScene(fdxObj).$.Number.length === 5)

      // test reconstructing the XML
      let builder = new xml2js.Builder()
      let xmlString = builder.buildObject(fdxObj)
      assert(
        xmlString.includes(
          `<Paragraph Bookmark="Start" Type="Scene Heading" Number="${getFirstScene(fdxObj).$.Number}">`
        )
      )
    })
  })
  describe('importFdxData', () => {
    it('throws an error if data can not be parsed', async () => {
      assertThrowsAsynchronously(async () => await importerFinalDraft.importFdxData({}), Error)
    })
    it('can parse a script', async () => {
      importerFinalDraft.insertSceneIds(fdxObj)
      let script = await importerFinalDraft.importFdxData(fdxObj)

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
  describe('getScriptLocations', () => {
    it('can extract all locations from script data', async () => {
      importerFinalDraft.insertSceneIds(fdxObj)
      let script = await importerFinalDraft.importFdxData(fdxObj)

      let locations = importerFinalDraft.getScriptLocations(script)
      assert.equal(locations[0][0], 'EXT. Mast 2 3 farm')
      assert.equal(locations[0][1], 1)

      assert.equal(locations[9][0], 'iNT. small town bank')
      assert.equal(locations[9][1], 2)
    })
  })
})
