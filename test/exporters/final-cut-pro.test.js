/*
TODO

what unit is `duration` expressed in for the FCP XML? 1294705

what to enter for name? description?

fileWidth/fileHeight?

where to place files?

does the filename matter?

flatten layers to single image

old project version (no layers) vs new project version (with layers)?
*/

const exporterFcp = require('../../src/js/exporters/final-cut-pro.js')

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

  // {
  //   id: 'clipitem-1',
  //   masterClipId: 'masterclip-1',
  //   name: 'Special stuff!', // set name if dialogue or action, otherwise filename
  //   description: '',
  //   duration: 1294705, // ???
  //   timebase: 24,
  //   start: 0,
  //   end: 24,
  //   fileId: 'file-1',
  //   fileName: '7S6A4465.JPG',
  //   filePathUrl: 'file://localhost/7S6A4465.JPG', // filename without path: file://localhost/filename.JPG
  //   fileWidth: 5760, // ???
  //   fileHeight: 3840, // ???
  //   label2: 'Lavender'
  // },
  // {
  // 	id: 'clipitem-2',
  // 	masterClipId: 'masterclip-2',
  // 	name: 'Special stuff 2!',
  // 	description: 'Special  22222222 stuff dfs asdfasd fasd fa!',
  // 	duration: 1294705,
  // 	timebase: 24,
  // 	start: 24,
  // 	start: 48,
  // 	fileId: 'file-2',
  // 	fileName: '7S6A4555.JPG',
  //   filePathUrl: 'file://localhost/7S6A4555.JPG',
  //   fileWidth: 5760,
  //   fileHeight: 3840,
  //   label2: 'Lavender'
  // }
}

console.log(
  exporterFcp.generateFinalCutProXml(exporterFcp.generateFinalCutProData(boardFileData))
)
