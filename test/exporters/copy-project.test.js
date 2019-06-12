//
// USAGE:
//
// find src/js/exporters/copy-project.js test/exporters/copy-project.test.js | entr -c npx electron-mocha --renderer test/exporters/copy-project.test.js
//

'use strict';
const fs = require('fs-extra')
const path = require('path')
const assert = require('assert')
const mockFs = require('mock-fs')

const { shell } = require('electron')

const exporterCopyProject = require('../../src/js/exporters/copy-project')

let fixturesPath = path.join(__dirname, '..', 'fixtures')

// remove the reference to `non-existing.wav` so we can continue without error
const modifyDucks = () => {
  let ducksPath = path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))
  let modifiedJson = JSON.parse(fs.readFileSync(ducksPath))
  modifiedJson.boards.forEach(b => {
    if (b.audio && b.audio.filename === 'non-existing.wav') {
      delete b.audio
    }
  })
  fs.writeFileSync(
    ducksPath,
    JSON.stringify(modifiedJson, null, 2)
  )
}

const withCustomCharacter = string => {
  let data = JSON.parse(string)
  let board = data.boards[0]
  board.sg.data
    .sceneObjects['26332F12-28FE-444C-B73F-B3F90B8C62A2']
    .model = 'models/characters/character.glb'
  return JSON.stringify(data)
}

const EMPTY_BUFFER = Buffer.from([8, 6, 7, 5, 3, 0, 9])

describe('exporters/copyProject', () => {
  beforeEach(function () {
    // fake filesystem
    // clone some actual files to use as source material
    mockFs({
      [fixturesPath]: {
        'projects': {
          'multi-scene': {
            'multi-scene.fdx': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'multi-scene.fdx'))),
            'storyboards': {
              'storyboard.settings': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'storyboards', 'storyboard.settings'))),
              'Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM': {
                'Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'storyboards', 'Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM', 'Scene-1-EXT-A-PLACE-DAY-1-ZX3ZM.storyboarder'))),
                'images': {
                  'board-1-E3XMX-reference.png':  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-E3XMX.png':            Buffer.from([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-E3XMX-thumbnail.png':  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-E3XMX-posterframe.jpg':  Buffer.from([8, 6, 7, 5, 3, 0, 9])
                }
              },
              'Scene-2-INT-A-PLACE-DAY-2-FA5K7': {
                'Scene-2-INT-A-PLACE-DAY-2-FA5K7.storyboarder': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'storyboards', 'Scene-2-INT-A-PLACE-DAY-2-FA5K7', 'Scene-2-INT-A-PLACE-DAY-2-FA5K7.storyboarder'))),
                'images': {
                  'board-1-35FBF-reference.png':  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-35FBF.png':            Buffer.from([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-35FBF-thumbnail.png':  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-35FBF-posterframe.jpg':  Buffer.from([8, 6, 7, 5, 3, 0, 9])
                }
              },
              'Scene-3-EXT-HOUSE-DAY-3-T5KRK': {
                'Scene-3-EXT-HOUSE-DAY-3-T5KRK.storyboarder': fs.readFileSync(path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'storyboards', 'Scene-3-EXT-HOUSE-DAY-3-T5KRK', 'Scene-3-EXT-HOUSE-DAY-3-T5KRK.storyboarder'))),
                'images': {
                  'board-1-MMN03-reference.png':  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-MMN03.png':            Buffer.from([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-MMN03-thumbnail.png':  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
                  'board-1-MMN03-posterframe.jpg':  Buffer.from([8, 6, 7, 5, 3, 0, 9])
                }
              }
            }
          }
        },

        'ducks': {
          'ducks.storyboarder': fs.readFileSync(path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))),
          'images': {
            'board-2-42VR9.png':                  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-reference.png':        Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-notes.png':            Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-thumbnail.png':        Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9-posterframe.jpg':      Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-2-42VR9.psd':                  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'audio.wav':                          Buffer.from([8, 6, 7, 5, 3, 0, 9]),

            'board-2-J74F5.png':                  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-2-J74F5-reference.png':        Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-2-J74F5-thumbnail.png':        Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-2-J74F5-posterframe.jpg':      Buffer.from([8, 6, 7, 5, 3, 0, 9]),

            'board-0-P2FLS.png':                  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-reference.png':        Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-notes.png':            Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-thumbnail.png':        Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS.psd':                  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-0-P2FLS-posterframe.jpg':      Buffer.from([8, 6, 7, 5, 3, 0, 9]),

            'board-1-WEBM4.png':                  Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-reference.png':        Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-notes.png':            Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-thumbnail.png':        Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-1-WEBM4-posterframe.jpg':      Buffer.from([8, 6, 7, 5, 3, 0, 9]),

            'board-98-PQKJM.png':                 Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-reference.png':       Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-notes.png':           Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-thumbnail.png':       Buffer.from([8, 6, 7, 5, 3, 0, 9]),
            'board-98-PQKJM-posterframe.jpg':     Buffer.from([8, 6, 7, 5, 3, 0, 9])
          },
        },

        'shot-generator': {
          'shot-generator.storyboarder': withCustomCharacter(
            fs.readFileSync(path.resolve(path.join(fixturesPath, 'shot-generator', 'shot-generator.storyboarder')))
          ),
          'images': {
            'board-1-UDRF3-thumbnail.png':        EMPTY_BUFFER,
            'board-1-UDRF3-posterframe.jpg':      EMPTY_BUFFER,
            'board-1-UDRF3-shot-generator.png':   EMPTY_BUFFER,
            'board-1-UDRF3-shot-generator-thumbnail.jpg':
                                                  EMPTY_BUFFER,
          },
          'models': {
            'characters': {
              'character.glb':                    EMPTY_BUFFER
            }
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

  it('throws an error when a referenced file (non-existing.wav) is missing', () => {
    let srcFilePath = path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))
    let dstFolderPath = path.resolve(path.join(fixturesPath, 'new-single-scene'))
    fs.ensureDirSync(dstFolderPath)
    assert.throws(
      () => {
        exporterCopyProject.copyProject(srcFilePath, dstFolderPath)
      },
      /ENOENT/
    )
  })
  it('can copy a single-scene project', () => {
    modifyDucks()

    // run the actual test
    let srcFilePath = path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))
    let dstFolderPath = path.resolve(path.join(fixturesPath, 'new-single-scene'))

    fs.ensureDirSync(dstFolderPath)
    exporterCopyProject.copyProject(srcFilePath, dstFolderPath)

    assert(fs.existsSync(path.join(dstFolderPath, 'new-single-scene.storyboarder')))
  })
  it('can copy a multi-scene project', () => {
    let srcFilePath = path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'multi-scene.fdx'))
    let dstFolderPath = path.resolve(path.join(fixturesPath, 'projects', 'new-multi-scene'))
    assert.equal(exporterCopyProject.getFilesUsedByProject(srcFilePath).length, 13) // files, excluding .fdx
    fs.mkdirSync(dstFolderPath)
    exporterCopyProject.copyProject(srcFilePath, dstFolderPath)

    assert(fs.existsSync(path.join(dstFolderPath, 'new-multi-scene.fdx')))
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

  it('includes the models/ folder for shot generator projects with custom models', () => {
    let srcFilePath = path.resolve(path.join(fixturesPath, 'shot-generator', 'shot-generator.storyboarder'))
    let dstFolderPath = path.resolve(path.join(fixturesPath, 'shot-generator-export-with-models'))
    fs.ensureDirSync(dstFolderPath)

    exporterCopyProject.copyProject(srcFilePath, dstFolderPath)

    assert(fs.existsSync(path.join(dstFolderPath, 'images', 'board-1-UDRF3-thumbnail.png')))
    assert(fs.existsSync(path.join(dstFolderPath, 'images', 'board-1-UDRF3-posterframe.jpg')))
    assert(fs.existsSync(path.join(dstFolderPath, 'images', 'board-1-UDRF3-shot-generator.png')))
    assert(fs.existsSync(path.join(dstFolderPath, 'images', 'board-1-UDRF3-shot-generator-thumbnail.jpg')))

    assert(fs.existsSync(path.join(dstFolderPath, 'images')), 'images/ folder should exist')
    assert(fs.existsSync(path.join(dstFolderPath, 'models')), 'models/ folder should exist')

    // custom model is included
    assert(fs.existsSync(path.join(dstFolderPath, 'models', 'characters', 'character.glb')))
  })

  describe('options', () => {
    let srcFilePath = path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))
    let dstFolderPath = path.resolve(path.join(fixturesPath, 'new-single-scene'))

    beforeEach(() => {
      fs.ensureDirSync(dstFolderPath)
    })

    it('can optionally copy board url main image from scenes created before Storyboarder 1.6.x', () => {
      // copies board url main image
      exporterCopyProject.copyProject(srcFilePath, dstFolderPath, {
        copyBoardUrlMainImages: true,
        ignoreMissing: true
      })

      let scene = JSON.parse(fs.readFileSync(path.join(dstFolderPath, 'new-single-scene.storyboarder')))
      assert(fs.existsSync(path.join(dstFolderPath, 'images', scene.boards[0].url)))
    })
    it('can optionally ignore missing files', () => {
      // ignores missing posterframes
      exporterCopyProject.copyProject(srcFilePath, dstFolderPath, {
        ignoreMissing: true
      })
    })
  })

  afterEach(function () {
    mockFs.restore()
  })
})
