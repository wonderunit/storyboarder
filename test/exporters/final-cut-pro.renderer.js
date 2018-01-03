// electron-mocha --renderer test/exporters/final-cut-pro.renderer.js

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')

const exporterFcp = require('../../src/js/exporters/final-cut-pro')

const getBoardFileData = () => ({
  "version": "0.6.0",
  "aspectRatio": 1,
  "fps": 24,
  "defaultBoardTiming": 2000,
  "boards": [
    {
      "uid": "7BZ4P",
      "url": "board-1-7BZ4P.png",
      "newShot": false,
      "lastEdited": 1498663891537,
      "layers": {
        "reference": {
          "url": "board-1-7BZ4P-reference.png"
        },
        "notes": {
          "url": "board-1-7BZ4P-notes.png"
        }
      },
      "number": 1,
      "shot": "1A",
      "time": 0,
      "duration": 999,
      "lineMileage": 1117.4179067245605,
      "dialogue": "dialogue here",
      "action": "action here",
      "notes": "notes here"
    },
    {
      "uid": "9MZ1P",
      "url": "board-2-9MZ1P.png",
      "newShot": false,
      "lastEdited": 1498663901313,
      "layers": {
        "reference": {
          "url": "board-2-9MZ1P-reference.png"
        },
        "notes": {
          "url": "board-2-9MZ1P-notes.png"
        }
      },
      "number": 2,
      "shot": "2A",
      "time": 999,
      "duration": 1001,
      "lineMileage": 1387.726619398883
    }
  ]
})

describe('exporters/final-cut-pro', () => {
  const getXml = async boardFileData => {
    let projectFileAbsolutePath = '/Users/me/projects/storyboarder/example\ storyboard/example\ storyboard.storyboarder'
    let outputPath = '/Users/me/projects/storyboarder/example\ storyboard/example\ storyboard.storyboarder/exports/output'
    let data = await exporterFcp.generateFinalCutProData(boardFileData, { projectFileAbsolutePath, outputPath })
    let xml = exporterFcp.generateFinalCutProXml(data)
    return xml
  }
  it('can generate final cut pro / adobe premiere xml', async () => {
    let xml
    let boardFileData = getBoardFileData()
  
    xml = await getXml(boardFileData)
  
    // check dash in filename
    assert(xml.includes("<pathurl>./example-storyboard-board-00001.png</pathurl>"))
  
    assert(xml.length > 32)
  })
  it('can generate at 23.976 fps', async () => {
    let xml
    let boardFileData = getBoardFileData()
  
    boardFileData.fps = 23.976 // AKA 23.97602397 AKA 24000/1001
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000
  
    xml = await getXml(boardFileData)
  
    // check fps calculations
    assert(xml.includes('<timebase>24</timebase>'))
    assert(xml.includes('<ntsc>TRUE</ntsc>'))
    assert(xml.includes(`<end>${29}</end>`))
    assert(xml.includes(`<end>${29 + 31}</end>`))
  })
  it('can generate at 24 fps', async () => {
    let xml
    let boardFileData = getBoardFileData()
  
    boardFileData.fps = 24
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000
  
    xml = await getXml(boardFileData)
  
    // check fps calculations
    assert(xml.includes('<timebase>24</timebase>'))
    assert(xml.includes('<ntsc>FALSE</ntsc>'))
    assert(xml.includes(`<end>${29}</end>`))
    assert(xml.includes(`<end>${29 + 31}</end>`))
  })
  it('can generate at 29.97 fps', async () => {
    let xml
    let boardFileData = getBoardFileData()
  
    boardFileData.fps = 29.97
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000
  
    xml = await getXml(boardFileData)
  
    // check fps calculations
    assert(xml.includes('<timebase>30</timebase>'))
    assert(xml.includes('<ntsc>TRUE</ntsc>'))
    assert(xml.includes(`<end>${29}</end>`))
    assert(xml.includes(`<end>${29 + 31}</end>`))
  })
  it('can generate at 59.94 fps', async () => {
    let xml
    let boardFileData = getBoardFileData()
  
    boardFileData.fps = 59.94
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000
  
    xml = await getXml(boardFileData)
  
    // check fps calculations
    assert(xml.includes('<timebase>60</timebase>'))
    assert(xml.includes('<ntsc>TRUE</ntsc>'))
    assert(xml.includes(`<end>${29}</end>`))
    assert(xml.includes(`<end>${29 + 31}</end>`))
  })
  it('can generate at 60 fps', async () => {
    let xml
    let boardFileData = getBoardFileData()
  
    boardFileData.fps = 60
  
    xml = await getXml(boardFileData)
  
    // check fps calculations
    assert(xml.includes('<timebase>60</timebase>'))
    assert(xml.includes('<ntsc>FALSE</ntsc>'))
  })
  it('can generate audio', async () => {
    let projectFileAbsolutePath = path.join(__dirname, '..', 'fixtures', 'audio', 'audio.storyboarder')
    let outputPath = path.join(__dirname, '..', 'fixtures', 'audio', 'exports', 'output')

    let boardFileData = JSON.parse(fs.readFileSync(projectFileAbsolutePath))
    let data = await exporterFcp.generateFinalCutProData(boardFileData, { projectFileAbsolutePath, outputPath })
    let xml = exporterFcp.generateFinalCutProXml(data)

    // 500 msec (15 frame @ 30 fps) 44.1khz 16bit mono WAV
    assert(xml.includes('<name>1ABCD-audio-1234567890000.wav</name>'))

    // 500 msec (15 frame @ 30 fps) 44.1khz 16bit stereo WAV
    assert(xml.includes('<name>1ABCD-audio-1234567890000.wav</name>'))
  })
  it('throws error for missing audio', async () => {
    let projectFileAbsolutePath = path.join(__dirname, '..', 'fixtures', 'audio', 'audio.storyboarder')
    let outputPath = path.join(__dirname, '..', 'fixtures', 'audio', 'exports', 'output')

    let boardFileData = JSON.parse(fs.readFileSync(projectFileAbsolutePath))
    boardFileData.boards[0].audio.filename = 'missing.wav'

    try {
      await exporterFcp.generateFinalCutProData(boardFileData, { projectFileAbsolutePath, outputPath })
    } catch (err) {
      return
    }

    assert.fail('expected error')
  })
})
