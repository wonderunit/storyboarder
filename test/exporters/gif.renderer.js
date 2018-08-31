// npx electron-mocha --renderer test/exporters/gif.renderer.js

const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp')

const boardModel = require('../../src/js/models/board')
const exporter = require('../../src/js/window/exporter')

describe('exportAnimatedGif', function () {
  const fixturesPath = path.join(__dirname, '..', 'fixtures')
  const imagesPath = path.join(fixturesPath, 'example', 'images')

  const watermarksPath = path.join(fixturesPath, 'images', 'watermarks')

  let tmpFolder
  before(function () {
    tmpFolder = tmp.dirSync({ unsafeCleanup: true })
  })
  after(function () {
    // tmpFolder.removeCallback()
  })

  it('can generate GIF with custom watermark', async function () {
    let projectFileAbsolutePath = path.join(fixturesPath, 'example', 'example.storyboarder')

    let boardData = JSON.parse(fs.readFileSync(projectFileAbsolutePath))
    let boards = boardData.boards
    let size = boardModel.boardFileImageSize(boardData)
    let boardSize = { width: size[0], height: size[1] }
    let destWidth = 888
    let mark = true

    let watermarkSrc = path.join(watermarksPath, 'watermark.png')
    // let watermarkSrc = path.join(watermarksPath, 'watermark_444x248.png')
    // let watermarkSrc = path.join(watermarksPath, 'watermark_248x444.png')

    let filepath = await exporter.exportAnimatedGif(
      boards,
      boardSize,
      destWidth,
      projectFileAbsolutePath,
      mark,
      boardData,
      watermarkSrc
    )

    let movedPath = path.join(tmpFolder.name, path.basename(filepath))
    fs.moveSync(filepath, movedPath)
    console.log('wrote test gif to:')
    console.log(`"${movedPath}"`)
  })
})
