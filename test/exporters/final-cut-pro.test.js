const assert = require('assert')

const exporterFcp = require('../../src/js/exporters/final-cut-pro')

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

describe('exporters/final-cut-pro', () => {
  const getXml = boardFileData => {
    let projectFileAbsolutePath = '/Users/me/projects/storyboarder/example\ storyboard/example\ storyboard.storyboarder'
    let outputPath = '/Users/me/projects/storyboarder/example\ storyboard/example\ storyboard.storyboarder/exports/output'
    return exporterFcp.generateFinalCutProXml(exporterFcp.generateFinalCutProData(boardFileData, { projectFileAbsolutePath, outputPath }))
  }
  it('can generate final cut pro / adobe premiere xml', () => {
    let xml

    assert.doesNotThrow(() => xml = getXml(boardFileData))

    // check dash in filename
    assert(xml.includes("<pathurl>./example-storyboard-board-00001.png</pathurl>"))
    
    assert(xml.length > 32)
  })
  it('can generate at 23.976 fps', () => {
    let xml

    boardFileData.fps = 24000 / 1001 // 23.97602397
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    assert.doesNotThrow(() => xml = getXml(boardFileData))
    
    // check fps calculations
    assert(xml.includes('<timebase>23.976</timebase>'))
    assert(xml.includes(`<end>${29}</end>`))
    assert(xml.includes(`<end>${29 + 31}</end>`))
  })
  it('can generate at 24 fps', () => {
    let xml

    boardFileData.fps = 24
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    assert.doesNotThrow(() => xml = getXml(boardFileData))
    
    // check fps calculations
    assert(xml.includes('<timebase>24</timebase>'))
    assert(xml.includes(`<end>${29}</end>`))
    assert(xml.includes(`<end>${29 + 31}</end>`))
  })
  it('can generate at 29.97 fps', () => {
    let xml

    boardFileData.fps = 29.97
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    assert.doesNotThrow(() => xml = getXml(boardFileData))
    
    // check fps calculations
    assert(xml.includes('<timebase>29.97</timebase>'))
    assert(xml.includes(`<end>${29}</end>`))
    assert(xml.includes(`<end>${29 + 31}</end>`))
  })
  it('can generate at 59.94 fps', () => {
    let xml

    boardFileData.fps = 59.94
    boardFileData.boards[0].time      = 0
    boardFileData.boards[0].duration  = 29 / boardFileData.fps * 1000
    boardFileData.boards[1].time      = boardFileData.boards[0].duration
    boardFileData.boards[1].duration  = 31 / boardFileData.fps * 1000

    assert.doesNotThrow(() => xml = getXml(boardFileData))
    
    // check fps calculations
    assert(xml.includes('<timebase>59.94</timebase>'))
    assert(xml.includes(`<end>${29}</end>`))
    assert(xml.includes(`<end>${29 + 31}</end>`))
  })
})
