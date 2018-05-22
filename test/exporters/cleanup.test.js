//
// USAGE:
//
// electron-mocha --renderer test/exporters/cleanup.test.js
//

'use strict';
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
            // linked PSD
            'board-2-42VR9.psd':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            // an existing audio file
            'audio.wav':                          new Buffer([8, 6, 7, 5, 3, 0, 9]),
            // a posterframe
            'board-2-42VR9-posterframe.jpg':      new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-2-J74F5.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-J74F5-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-J74F5-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-0-P2FLS.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-notes.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            // board-0-P2FLS.psd

            'board-1-WEBM4.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-notes.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-98-PQKJM.png':                 new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-reference.png':       new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-notes.png':           new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-thumbnail.png':       new Buffer([8, 6, 7, 5, 3, 0, 9]),
            // unlinked PSD
            'board-98-PQKJM.psd':                 new Buffer([8, 6, 7, 5, 3, 0, 9]),
            // a not used
            'unused.wav':                         new Buffer([8, 6, 7, 5, 3, 0, 9]),

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
    // (`trash` doesn't work with mockFS)
    const trashFn = glob => {
      let trashedFiles = glob.map(f => path.basename(f))

      assert(trashedFiles.includes('unused.png'))
      assert(trashedFiles.includes('unused.psd'))

      // it deletes PSDs that are not linked (board-98-PQKJM.psd)
      assert(trashedFiles.includes('board-98-PQKJM.psd'))

      // it deletes audio files that are not referenced (unused.wav)
      assert(trashedFiles.includes('unused.wav'))

      assert.equal(trashedFiles.length, 4)

      //
      // fake trash the file
      // (this works with mockFS)
      glob.forEach(f => {
        if (f.includes('test') && f.includes('fixtures')) { // sanity check
          // console.log('deleting', f)
          fs.unlinkSync(f)
        }
      })
  
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

        // LINKS
        //
        // it renames PSDs that are linked (board-2-42VR9.psd)
        assert.equal(fs.existsSync(path.join(fixturesPath, 'ducks', 'images', 'board-2-42VR9.psd')), false)
        assert.equal(fs.existsSync(path.join(fixturesPath, 'ducks', 'images', 'board-1-42VR9.psd')), true)

        // it removes links for PSD files that don't exist (board-0-P2FLS.png)
        assert.equal(newBoardData.boards[2].url, 'board-3-P2FLS.png') // confirm it was renamed
        assert.equal(typeof newBoardData.boards[2].link, 'undefined') // confirm the link was deleted

        // AUDIO
        //
        // - delete audio object if file doesn't exist
        // - delete file if filename isn't referenced by a board's audio object

        // it preserves audio object for audio files that exist
        assert.equal(newBoardData.boards[0].audio.filename, 'audio.wav')

        // it removes audio object for audio files that don’t exist
        assert.equal(typeof newBoardData.boards[2].audio, 'undefined') // confirm the audio file was deleted

        // it copies audio files that exist
        assert.equal(fs.existsSync(path.join(fixturesPath, 'ducks', 'images', 'audio.wav')), true)
        // but not those that don't
        assert.equal(fs.existsSync(path.join(fixturesPath, 'ducks', 'images', 'unused.wav')), false)
        assert.equal(fs.existsSync(path.join(fixturesPath, 'ducks', 'images', 'non-existing.wav')), false)

        // it copies, and renames, the posterframe
        assert.equal(fs.existsSync(path.join(fixturesPath, 'ducks', 'images', 'board-1-42VR9-posterframe.jpg')), true)

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
