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
  })
})
