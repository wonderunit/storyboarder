// electron-mocha --renderer test/exporters/final-cut-pro-x.renderer.test.js

const assert = require('assert')
const path = require('path')
const fs = require('fs')

window.TONE_SILENCE_VERSION_LOGGING = true
const exporterFcpX = require('../../src/js/exporters/final-cut-pro-x')

let boardFileData = {
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
}

describe('exporters/final-cut-pro-x', () => {
  const getXml = async boardFileData => {
    let projectFileAbsolutePath = '/Users/me/projects/storyboarder/example\ storyboard/example\ storyboard.storyboarder'
    let outputPath = '/Users/me/projects/storyboarder/example\ storyboard/example\ storyboard.storyboarder/exports/output'
    let data = await exporterFcpX.generateFinalCutProXData(boardFileData, { projectFileAbsolutePath, outputPath })
    return exporterFcpX.generateFinalCutProXXml(data)
  }
  it('can generate final cut pro x xml', async () => {
    let xml

    xml = await getXml(boardFileData)

    // check dash in filename
    assert(xml.includes('src="./example-storyboard-board-00001.png'))

    assert(xml.length > 32)
  })
  it('can generate at 23.976 fps', async () => {
    boardFileData.fps = 23.976 // AKA 23.97602397 AKA 24000/1001
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    xml = await getXml(boardFileData)

    // check fps calculations
    // <format id="r1" frameDuration="1001/24000s" width="900" height="900"/>
    let m = xml.match(/frameDuration="([^"]+)"/)
    assert.equal(m[1], '1001/24000s')

    assert(xml.includes('<video name="1A" offset="0s" ref="r4" duration="29029/24000s" start="0s">'))
    assert(xml.includes('<video name="2A" offset="29029/24000s" ref="r5" duration="31031/24000s" start="0s">'))
  })
  it('can generate at 24 fps', async () => {
    boardFileData.fps = 24
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    xml = await getXml(boardFileData)

    // check fps calculations
    // <format id="r1" frameDuration="100/2400s" width="900" height="900"/>
    let m = xml.match(/frameDuration="([^"]+)"/)
    assert.equal(m[1], '100/2400s')

    assert(xml.includes('<video name="1A" offset="0s" ref="r4" duration="2900/2400s" start="0s">'))
    assert(xml.includes('<video name="2A" offset="2900/2400s" ref="r5" duration="3100/2400s" start="0s">'))
  })
  it('can generate at 29.97 fps', async () => {
    boardFileData.fps = 29.97
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    xml = await getXml(boardFileData)

    // check fps calculations
    // <format id="r1" frameDuration="100/2997s" width="900" height="900"/>
    let m = xml.match(/frameDuration="([^"]+)"/)
    assert.equal(m[1], '100/2997s')

    assert(xml.includes('<video name="1A" offset="0s" ref="r4" duration="2900/2997s" start="0s">'))
    assert(xml.includes('<video name="2A" offset="2900/2997s" ref="r5" duration="3100/2997s" start="0s">'))
  })
  it('can generate at 59.94 fps', async () => {
    boardFileData.fps = 59.94
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    xml = await getXml(boardFileData)

    // check fps calculations
    // <format id="r1" frameDuration="100/2997s" width="900" height="900"/>
    let m = xml.match(/frameDuration="([^"]+)"/)
    assert.equal(m[1], '50/2997s')

    assert(xml.includes('<video name="1A" offset="0s" ref="r4" duration="1450/2997s" start="0s">'))
    assert(xml.includes('<video name="2A" offset="1450/2997s" ref="r5" duration="1550/2997s" start="0s">'))
  })
  it('can generate with overlapping audio', async () => {
    let projectFileAbsolutePath = path.join(__dirname, '..', 'fixtures', 'audio', 'audio.storyboarder')
    let outputPath = path.join(__dirname, '..', 'fixtures', 'audio', 'exports', 'output')

    let boardFileData = JSON.parse(fs.readFileSync(projectFileAbsolutePath))

    boardFileData.boards[0].duration = 250
    boardFileData.boards[1].duration = 250

    let data = await exporterFcpX.generateFinalCutProXData(boardFileData, { projectFileAbsolutePath, outputPath })
    let xml = exporterFcpX.generateFinalCutProXXml(data)

    assert(xml.includes('<asset-clip name="2ABCD-audio-1234567890000.wav" lane="-2"'))
  })
})
