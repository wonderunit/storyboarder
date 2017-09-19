const fs = require('fs')
const assert = require('assert')

const fountainSceneIdUtil = require('../../src/js/fountain-scene-id-util')

describe('fountainSceneIdUtil', () => {
  it('insertSceneIds works on Windows files with ASCII 13 carriage returns', done => {
    let fixtureFile = './test/fixtures/fountain/ascii-13-carriage-returns.fountain'
    fs.readFile(fixtureFile, 'utf-8', (err, data) => {
      let resultA = fountainSceneIdUtil.insertSceneIds(data)
      let resultB = fountainSceneIdUtil.insertSceneIds(resultA[0])
      assert.equal(resultA[0], resultB[0])
      done()
    })
  })
  it('insertSceneIds works on UNIX files with newlines', done => {
    let fixtureFile = './test/fixtures/fountain/unix-newlines.fountain'
    fs.readFile(fixtureFile, 'utf-8', (err, data) => {
      let resultA = fountainSceneIdUtil.insertSceneIds(data)
      let resultB = fountainSceneIdUtil.insertSceneIds(resultA[0])
      assert.equal(resultA[0], resultB[0])
      done()
    })
  })
})
