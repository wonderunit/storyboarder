const assert = require('assert')

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
  const getXml = boardFileData => {
    let projectFileAbsolutePath = '/Users/me/projects/storyboarder/example\ storyboard/example\ storyboard.storyboarder'
    let outputPath = '/Users/me/projects/storyboarder/example\ storyboard/example\ storyboard.storyboarder/exports/output'
    return exporterFcpX.generateFinalCutProXXml(exporterFcpX.generateFinalCutProXData(boardFileData, { projectFileAbsolutePath, outputPath }))
  }
  it('can generate final cut pro x xml', () => {
    let xml

    assert.doesNotThrow(() => xml = getXml(boardFileData))

    // check dash in filename
    assert(xml.includes('src="./example-storyboard-board-00001.png'))

    assert(xml.length > 32)
  })
  it('can generate at 23.976 fps', () => {
    boardFileData.fps = 1 / (1001 / 24000) // 23.97602397
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    xml = getXml(boardFileData)

    // check fps calculations
    // <format id="r1" frameDuration="1001/24000s" width="900" height="900"/>
    let m = xml.match(/frameDuration="([^"]+)"/)
    assert.equal(m[1], '1001/24000s')

    assert(xml.includes('<video name="1A" offset="0s" ref="r3" duration="29029/24000s" start="0s"/>'))
    assert(xml.includes('<video name="2A" offset="29029/24000s" ref="r4" duration="31031/24000s" start="0s"/>'))
  })
  it('can generate at 24 fps', () => {
    boardFileData.fps = 24
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    xml = getXml(boardFileData)

    // check fps calculations
    // <format id="r1" frameDuration="100/2400s" width="900" height="900"/>
    let m = xml.match(/frameDuration="([^"]+)"/)
    assert.equal(m[1], '100/2400s')

    assert(xml.includes('<video name="1A" offset="0" ref="r3" duration="290/2400s" start="0s"/>'))
    assert(xml.includes('<video name="2A" offset="290/2400s" ref="r4" duration="310/2400s" start="0s"/>'))
  })
  it('can generate at 29.97 fps')
  it('can generate at 59.94 fps')
})
