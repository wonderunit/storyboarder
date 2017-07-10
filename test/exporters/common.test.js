//
// USAGE:
//
// electron-mocha --renderer test/exporters/common.test.js
//

'use strict';

const tmp = require('tmp')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const { shell } = require('electron')

const exporterCommon = require('../../src/js/exporters/common')

let fixturesPath = path.join(__dirname, '..', 'fixtures')

describe('exporters/common', function () {
  let tmpFolder

  before(function () {
    tmpFolder = tmp.dirSync({ unsafeCleanup: true })
  })
  // after(function () {
  //   tmpFolder.removeCallback()
  // })

  // exporters/common#flattenBoardToContext
  // used by main-window#updateThumbnail
  it('can build a thumbnail image, from memory, to a context', function (done) {
    let size = [900, 900]

    let canvasImageSources = [
      {
        canvasImageSource: document.createElement('canvas'),
        opacity: 1
      },
      {
        canvasImageSource: document.createElement('canvas'),
        opacity: 0.5
      }
    ]

    let canvas = document.createElement('canvas')
    canvas.width = size[0]
    canvas.height = size[1]
    let context = canvas.getContext('2d')
    exporterCommon.flattenBoardToContext(context, canvasImageSources, size)

    done()
  })

  // exporters/common#exportFlattenedBoard
  // used by exporters
  it('can export a thumbnail image, from files, to a file', function(done) {
    let projectFileAbsolutePath = path.resolve(path.join(fixturesPath, 'example', 'example.storyboarder'))
    let project = JSON.parse(fs.readFileSync(projectFileAbsolutePath))
  
    let basenameWithoutExt = path.basename(projectFileAbsolutePath, path.extname(projectFileAbsolutePath))
    let index = 0
    let board = project.boards[index]
  
    // this is the export filename
    // let filenameForExport = exporterCommon.boardFilenameForExport(board, index, basenameWithoutExt)
  
    // this is the thumbnail filename
    let filenameForExport = exporterCommon.boardFilenameForThumbnail(board)
  
    let size = [Math.floor(60 * project.aspectRatio), 60]
    let outputPath = tmpFolder.name
  
    exporterCommon.exportFlattenedBoard(board, filenameForExport, size, projectFileAbsolutePath, outputPath).then((pathToExport) => {
      // console.log('exported to', pathToExport)
      assert(pathToExport.length)
      //
      // uncomment this to reveal the flattened board 
      //
      // shell.showItemInFolder(pathToExport)
      done()
    }).catch(err => {
      done(err)
    })
  })

  // exporters/common#exportFlattenedBoard
  // used by exporters
  it('can handle a file no longer existing', function(done) {
    let projectFileAbsolutePath = path.resolve(path.join(fixturesPath, 'example', 'example.storyboarder'))
    let project = JSON.parse(fs.readFileSync(projectFileAbsolutePath))
  
    let basenameWithoutExt = path.basename(projectFileAbsolutePath, path.extname(projectFileAbsolutePath))
    let index = 0
    let board = project.boards[index]
    let filenameForExport = exporterCommon.boardFilenameForThumbnail(board)
  
    let size = [Math.floor(60 * project.aspectRatio), 60]
    let outputPath = tmpFolder.name
  
    board.url = 'missing.png'
  
    exporterCommon.exportFlattenedBoard(board, filenameForExport, size, projectFileAbsolutePath, outputPath).then((pathToExport) => {
    }).catch(err => {
      assert(err.message.match('Error: Could not load'))
      done()
    }).catch(done)
  })
})
