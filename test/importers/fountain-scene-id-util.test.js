const fs = require('fs')
const assert = require('assert')

const fountainSceneIdUtil = require('../../src/js/fountain-scene-id-util')

describe('fountainSceneIdUtil', () => {
  describe('insertSceneIds', () => {
    // \n
    it('works for files with line feed newlines', done => {
      let fixtureFile = './test/fixtures/fountain/eol-lf.fountain'
      fs.readFile(fixtureFile, 'utf-8', (err, data) => {
        let resultA = fountainSceneIdUtil.insertSceneIds(data)
        let resultB = fountainSceneIdUtil.insertSceneIds(resultA[0])
        assert.equal(resultA[0], resultB[0])
        done()
      })
    })
    // \r\n
    it('works for files with carriage return + line feed newlines', done => {
      let fixtureFile = './test/fixtures/fountain/eol-crlf.fountain'
      fs.readFile(fixtureFile, 'utf-8', (err, data) => {
        let resultA = fountainSceneIdUtil.insertSceneIds(data)
        let resultB = fountainSceneIdUtil.insertSceneIds(resultA[0])
        assert.equal(resultA[0], resultB[0])
        done()
      })
    })
    it('can handle an octothorpe', () => {
      let rawText = 'EXT. A PLACE - DAY #1'

      let [ scriptDataA, hasAddedA ] = fountainSceneIdUtil.insertSceneIds(rawText)
      assert(hasAddedA)

      let [ scriptDataB, hasAddedB ] = fountainSceneIdUtil.insertSceneIds(scriptDataA)

      // doesn't need to change after first time through
      assert(!hasAddedB)
      assert.equal(scriptDataA, scriptDataB)

      // adds the scene id after the octothorpe
      assert(scriptDataA.includes('EXT. A PLACE - DAY #1 #1'))
    })
  })
})
