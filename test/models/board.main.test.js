/* global describe it */
const fs = require('fs')
const path = require('path')

const boardModel = require('../../src/js/models/board')

const assert = require('assert')

const fixturesPath = path.join(__dirname, '..', 'fixtures')
const scene = JSON.parse(
  fs.readFileSync(
    path.join(fixturesPath, 'audio', 'audio.storyboarder')
  )
)

describe('boardModel', () => {
  describe('#getMediaDescription', () => {
    describe('when reading from scene data', () => {
      let board = scene.boards[0]
      let media = boardModel.getMediaDescription(board)
      it('lists media files', () => {
        assert(media.layers.reference.length)
        assert(media.layers.notes.length)
        assert(media.audio.length)
        assert(media.link == null)
      })
      it('includes board.url and excludes fill layer', () => {
        assert(media.url == board.url)
        assert(media.layers.fill == null)
      })
    })
    describe('edge cases', () => {
      // for old iPad app boards
      it('can handle a missing layers object', () => {
        let board = {
          ...scene.boards[0],
          layers: undefined
        }
        let media = boardModel.getMediaDescription(board)
        assert(Object.keys(media.layers).length === 0)
      })
      it('can handle a blank layers object', () => {
        let board = {
          ...scene.boards[0],
          layers: {}
        }
        let media = boardModel.getMediaDescription(board)
        assert(Object.keys(media.layers).length === 0)
      })
    })
  })
})
