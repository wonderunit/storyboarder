//
// USAGE:
//
// find src/js/exporters/copy-project.js test/exporters/copy-project.test.js | entr -c electron-mocha --renderer test/exporters/copy-project.test.js
//

'use strict';
const tmp = require('tmp')
const fs = require('fs-extra')
const path = require('path')
const assert = require('assert')
const mockFs = require('mock-fs')

const { shell } = require('electron')

const exporterCopyProject = require('../../src/js/exporters/copy-project')

let fixturesPath = path.join(__dirname, '..', 'fixtures')

describe('exporters/copyProject', () => {
  before(function () {
    // fake filesystem
    // clone some actual files to use as source material
    mockFs({
      [fixturesPath]: {
        'projects': {
          'multi-scene': {
            'multi-scene.fountain': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'multi-scene.fountain'))),
            'storyboards': {
              'storyboard.settings': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'storyboards', 'storyboard.settings'))),
              'Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM': {
                'Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'storyboards', 'Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM', 'Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder'))),
                'images': {
                  'board-1-E3XMX-reference.png':  new Buffer([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-E3XMX.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-E3XMX-thumbnail.png':  new Buffer([8, 6, 7, 5, 3, 0, 9])
                }
              },
              'Scene-2-INT-A-PLACE-DAY-2-FA5K7': {
                'Scene-2-INT-A-PLACE-DAY-2-FA5K7.storyboarder': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'storyboards', 'Scene-2-INT-A-PLACE-DAY-2-FA5K7', 'Scene-2-INT-A-PLACE-DAY-2-FA5K7.storyboarder'))),
                'images': {
                  'board-1-35FBF-reference.png':  new Buffer([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-35FBF.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-35FBF-thumbnail.png':  new Buffer([8, 6, 7, 5, 3, 0, 9])
                }
              },
              'Scene-3-EXT-HOUSE-DAY-3-T5KRK': {
                'Scene-3-EXT-HOUSE-DAY-3-T5KRK.storyboarder': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'storyboards', 'Scene-3-EXT-HOUSE-DAY-3-T5KRK', 'Scene-3-EXT-HOUSE-DAY-3-T5KRK.storyboarder'))),
                'images': {
                  'board-1-MMN03-reference.png':  new Buffer([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-MMN03.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-MMN03-thumbnail.png':  new Buffer([8, 6, 7, 5, 3, 0, 9])
                }
              }
            }
          }
        },

        'ducks': {
          'ducks.storyboarder': fs.readFileSync(path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))),
          'images': {
            'board-2-42VR9.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-notes.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9.psd':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-2-J74F5.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-J74F5-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-2-J74F5-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-0-P2FLS.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-notes.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS.psd':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-1-WEBM4.png':                  new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-reference.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-notes.png':            new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-thumbnail.png':        new Buffer([8, 6, 7, 5, 3, 0, 9]),

            'board-98-PQKJM.png':                 new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-reference.png':       new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-notes.png':           new Buffer([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-thumbnail.png':       new Buffer([8, 6, 7, 5, 3, 0, 9])
          }
        }
      }
    })
  })

  // FOR DEBUGGING
  //
  // it('can get files used by a project', () => {
  //   let srcFolderPath = path.join(fixturesPath, 'ducks')
  //   let srcFilePath = path.resolve(srcFolderPath, 'ducks.storyboarder')
  //   let dstFolderPath = path.resolve(path.join(fixturesPath, 'new-single-scene'))
  //   let files = exporterCopyProject.getFilesUsedByProject(srcFilePath)
  // 
  //   let pairs = files.map(from => ({
  //     from: from,
  //     to: from.replace(srcFolderPath, dstFolderPath)
  //   }))
  // 
  //   const relpath = str => str.replace(path.join(process.cwd(), 'test', 'fixtures'), '')
  // 
  //   console.log(
  //     pairs.map(({ from, to }) => ({
  //       from: relpath(from),
  //       to: relpath(to)
  //     }))
  //   )
  // })

  it('can copy a single-scene project', () => {
    let srcFilePath = path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))
    let dstFolderPath = path.resolve(path.join(fixturesPath, 'new-single-scene'))
    assert.equal(exporterCopyProject.getFilesUsedByProject(srcFilePath).length, 21) // files, excluding .storyboarder

    fs.ensureDirSync(dstFolderPath)
    exporterCopyProject.copyProject(srcFilePath, dstFolderPath)

    assert(fs.existsSync(path.join(dstFolderPath, 'new-single-scene.storyboarder')))
  })
  it('can copy a multi-scene project', () => {
    let srcFilePath = path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'multi-scene.fountain'))
    let dstFolderPath = path.resolve(path.join(fixturesPath, 'projects', 'new-multi-scene'))
    assert.equal(exporterCopyProject.getFilesUsedByProject(srcFilePath).length, 13) // files, excluding .fountain

    fs.mkdirSync(dstFolderPath)
    exporterCopyProject.copyProject(srcFilePath, dstFolderPath)

    assert(fs.existsSync(path.join(dstFolderPath, 'new-multi-scene.fountain')))
  })
  it('throws an error when the source does not exist', () => {
    let srcFilePath = path.resolve(path.join(fixturesPath, '404', '404.storyboarder'))
    let dstFolderPath = path.resolve(path.join(fixturesPath, 'new-single-scene'))
    fs.ensureDirSync(dstFolderPath)

    assert.throws(
      () => {
        exporterCopyProject.copyProject(srcFilePath, dstFolderPath)
      },
      /ENOENT/
    )
  })

  after(function () {
    mockFs.restore()
  })
})
