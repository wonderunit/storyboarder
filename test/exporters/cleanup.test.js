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
const mockFs = require('mock-fs')

const { shell } = require('electron')

const boardModel = require('../../src/js/models/board')
const exporterCleanup = require('../../src/js/exporters/cleanup')

let fixturesPath = path.join(__dirname, '..', 'fixtures')

describe('exporters/cleanup', function () {
  let absolutePathToStoryboarderFile

  before(function () {
    // use real filesystem
    absolutePathToStoryboarderFile = path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))

    const actualJsonAsString = fs.readFileSync(absolutePathToStoryboarderFile)

    // fake filesystem
    mockFs({
      [fixturesPath]: {
        'ducks': {
          'ducks.storyboarder': actualJsonAsString,
          'images': {
            'board-2-42VR9.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-notes.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-2-J74F5.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-J74F5-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-J74F5-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-0-P2FLS.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-notes.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-1-WEBM4.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-notes.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-98-PQKJM.png':                 new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-reference.png':       new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-notes.png':           new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-thumbnail.png':       new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'unused.png':                         new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'unused.psd':                         new Buffer([8, 6, 7, 5, 3, 0, 9])
          }
        }
      }
    })
  })

  it('can prepare data to cleanup a scene', function (done) {
    let project = JSON.parse(fs.readFileSync(absolutePathToStoryboarderFile))
    let {
      renamablePairs,
      boardData
    } = exporterCleanup.prepareCleanup(project)

    let first = renamablePairs[0]

    assert.equal(first.from, 'board-2-42VR9-reference.png')
    assert.equal(first.to, 'board-1-42VR9-reference.png')
    assert.equal(boardData.boards[0].url, renamablePairs[1].to)

    // TODO test number, shot
    // assert.equal(boardData.boards[boardData.boards.length - 1].number, boardData.boards.length)

    done()
  })

  it('can save a cleaned project', function (done) {
    // mock the trash fn so we can test it
    const trashFn = glob => {
      let trashedFiles = glob.map(f => path.basename(f))

      assert(trashedFiles.includes('unused.png'))
      assert(trashedFiles.includes('unused.psd'))
      assert.equal(trashedFiles.length, 2)
  
      return Promise.resolve()
    }
  
    exporterCleanup
      .cleanupScene(absolutePathToStoryboarderFile, trashFn)
      .then(newBoardData => {
        let project = JSON.parse(fs.readFileSync(absolutePathToStoryboarderFile))
        assert.equal(project.boards[project.boards.length - 1].url, "board-5-PQKJM.png")
        assert.equal(newBoardData.boards[0].url, project.boards[0].url)

        assert(
          fs.readdirSync(path.resolve(path.join(fixturesPath, 'ducks', 'images')))
            .includes('board-1-42VR9-thumbnail.png')
        )

        done()
      })
      .catch(done)
  })

  // TODO be smart enough to remove blank (no drawing) images from filesystem and data?
  //
  //
  after(function () {
    mockFs.restore()
  })
})
