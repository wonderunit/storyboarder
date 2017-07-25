//
// USAGE:
//
// electron-mocha --renderer test/exporters/cleanup.test.js
//

'use strict';

const tmp = require('tmp')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const { shell } = require('electron')

const boardModel = require('../../src/js/models/board')
const exporterCleanup = require('../../src/js/exporters/cleanup')

let fixturesPath = path.join(__dirname, '..', 'fixtures')

describe('exporters/cleanup', function () {
  let tmpFolder

  before(function () {
    tmpFolder = tmp.dirSync({ unsafeCleanup: true })
  })

  it('can prepare data to cleanup a board', function (done) {
    let projectFileAbsolutePath = path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))
    let project = JSON.parse(fs.readFileSync(projectFileAbsolutePath))

    let {
      renameablePairs,
      boardData
    } = exporterCleanup.cleanupScene(project)

    let first = renameablePairs[0]
    assert.equal(first.from, 'board-2-42VR9-reference.png')
    assert.equal(first.to, 'board-1-42VR9-reference.png')
    assert.equal(boardData.boards[0].url, renameablePairs[1].to)
    
    // TODO test number, shot
    // assert.equal(boardData.boards[boardData.boards.length - 1].number, boardData.boards.length)

    done()
  })

  it('can save a board after cleanup', function (done) {
    done(new Error('Not Implemented'))
  })

  after(function () {
    tmpFolder.removeCallback()
  })
})
