const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const path = require('path')
const GIFEncoder = require('gifencoder')
const moment = require('moment')
const app = require("electron").remote.app

const {
  boardFileImageSize,
  boardFilenameForExport
} = require('../models/board')
const {
  getImage,
  exportFlattenedBoard,
  ensureExportsPathExists
} = require('../exporters/common.js')

const exporterFcpX = require('../exporters/final-cut-pro-x.js')
const exporterFcp = require('../exporters/final-cut-pro.js')
const exporterPDF = require('../exporters/pdf.js')
const util = require('../utils/index.js')

class Exporter extends EventEmitter {
  constructor () {
    super()
  }

  exportFcp (boardData, projectFileAbsolutePath) {
    return new Promise(resolve => {
      
      let exportsPath = ensureExportsPathExists(projectFileAbsolutePath)

      let basename = path.basename(projectFileAbsolutePath)
      let outputPath = path.join(
        exportsPath,
        basename + ' Exported ' + moment().format('YYYY-MM-DD hh.mm.ss')
      )
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath)
      }

      let xml = exporterFcp.generateFinalCutProXml(exporterFcp.generateFinalCutProData(boardData, { projectFileAbsolutePath, outputPath }))
      fs.writeFileSync(path.join(outputPath, basename + '.xml'), xml)

      let fcpxml = exporterFcpX.generateFinalCutProXXml(exporterFcpX.generateFinalCutProXData(boardData, { projectFileAbsolutePath, outputPath }))
      fs.writeFileSync(path.join(outputPath, basename + '.fcpxml'), fcpxml)

      // export ALL layers of each one of the boards
      let index = 0
      let writers = []
      let basenameWithoutExt = path.basename(projectFileAbsolutePath, path.extname(projectFileAbsolutePath))
      for (let board of boardData.boards) {
        writers.push(new Promise(resolve => {
          let filenameForExport = boardFilenameForExport(board, index, basenameWithoutExt)
          exportFlattenedBoard(
            board,
            filenameForExport,
            boardFileImageSize(boardData),
            projectFileAbsolutePath,
            outputPath
          ).then(() => resolve()).catch(err => console.error(err))
        }))

        index++
      }

      Promise.all(writers).then(() => {
        resolve(outputPath)
      })
    })
  }

 
  exportPDF (boardData, projectFileAbsolutePath) {
    return new Promise(resolve => {
      let outputPath = app.getPath('temp')

      let index = 0
      let writers = []
      let basenameWithoutExt = path.basename(projectFileAbsolutePath, path.extname(projectFileAbsolutePath))
      for (let board of boardData.boards) {
        writers.push(new Promise(resolve => {
          let filenameForExport = `board-` + index + '.jpg'
          exportFlattenedBoard(
            board,
            filenameForExport,
            boardFileImageSize(boardData),
            projectFileAbsolutePath,
            outputPath,
            0.4
          ).then(() => resolve()).catch(err => console.error(err))
        }))
        index++
      }
      
      Promise.all(writers).then(() => {
        let exportsPath = ensureExportsPathExists(projectFileAbsolutePath)
        let filepath = path.join(exportsPath, basenameWithoutExt + ' ' + moment().format('YYYY-MM-DD hh.mm.ss') + '.pdf')
        exporterPDF.generatePDF('LTR', 1.773, 3, 3, 10, boardData, basenameWithoutExt, filepath)
        resolve(filepath)
      }).catch(err => {
        console.log(err)
      })

    })
  }

  exportImages (boardData, projectFileAbsolutePath, outputPath = null) {
    return new Promise(resolve => {
      let exportsPath = ensureExportsPathExists(projectFileAbsolutePath)
      let basename = path.basename(projectFileAbsolutePath)
      if (!outputPath) {
        outputPath = path.join(
          exportsPath,
         basename + ' Images ' + moment().format('YYYY-MM-DD hh.mm.ss')
        )
      }

      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath)
      }

      // export ALL layers of each one of the boards
      let index = 0
      let writers = []
      let basenameWithoutExt = path.basename(projectFileAbsolutePath, path.extname(projectFileAbsolutePath))
      for (let board of boardData.boards) {
        writers.push(new Promise(resolve => {
          let filenameForExport = boardFilenameForExport(board, index, basenameWithoutExt)
          exportFlattenedBoard(
            board,
            filenameForExport,
            boardFileImageSize(boardData),
            projectFileAbsolutePath,
            outputPath
          ).then(() => resolve()).catch(err => console.error(err))
        }))

        index++
      }

      Promise.all(writers).then(() => {
        resolve(outputPath)
      }).catch(err => {
        console.log(err)
      })
    })
  }

  exportAnimatedGif (boards, boardSize, destWidth, boardPath, mark, boardData) {
    let canvases = []

    let sequence = Promise.resolve()

    getImage('./img/watermark.png').then( (watermarkImage) => {

      boards.forEach((board)=> {
        // Chain one computation onto the sequence
        let canvas = document.createElement('canvas')
        canvas.width = boardSize.width
        canvas.height = boardSize.height
        let context = canvas.getContext('2d')
        sequence = sequence.then(function() {
          if (board.layers) {
            // get reference layer if exists
            if (board.layers['reference']) {
              let filepath = path.join(boardPath, 'images', board.layers['reference'].url)
              return getImage(filepath)
            }
          }
        }).then(function(result) {
          // Draw reference if exists and load main.
          if (result) {
            context.drawImage(result,0,0)
          }
          let filepath = path.join(boardPath, 'images', board.url)
          return getImage(filepath)
        }).then(function(result) {
          // draw main and push it to the array of canvases
          if (result) {
            context.drawImage(result,0,0)
          }
          canvases.push(canvas)
        })
      })

      sequence.then(()=>{
        let aspect = boardSize.height / boardSize.width
        let destSize = {width: destWidth, height: Math.floor(destWidth*aspect)}
        let encoder = new GIFEncoder(destSize.width, destSize.height)
        // save in the boards directory
        let filename = boardPath.split(path.sep)
        filename = filename[filename.length-1]
        if (!fs.existsSync(path.join(boardPath, 'exports'))) {
          fs.mkdirSync(path.join(boardPath, 'exports'))
        }
        let filepath = path.join(boardPath, 'exports', filename + ' ' + moment().format('YYYY-MM-DD hh.mm.ss') + '.gif')
        console.log(filepath)
        encoder.createReadStream().pipe(fs.createWriteStream(filepath))
        encoder.start()
        encoder.setRepeat(0)   // 0 for repeat, -1 for no-repeat
        encoder.setDelay(boardData.defaultBoardTiming)  // frame delay in ms
        encoder.setQuality(10) // image quality. 10 is default.
        let canvas = document.createElement('canvas')
        canvas.width = destSize.width
        canvas.height = destSize.height
        let context = canvas.getContext('2d')
        for (var i = 0; i < boards.length; i++) {
          context.fillStyle = 'white'
          context.fillRect(0,0,destSize.width,destSize.height)
          context.drawImage(canvases[i], 0,0,destSize.width,destSize.height)
          if (mark) {
            context.drawImage(watermarkImage,destSize.width-watermarkImage.width,destSize.height-watermarkImage.height)
          }
          let duration
          if (boards[i].duration) {
            duration = boards[i].duration
          } else {
            duration = boardData.defaultBoardTiming
          }
          encoder.setDelay(duration)
         encoder.addFrame(context)
        }
        encoder.finish()
        // emit a finish event!
        this.emit('complete', filepath)
      })
    })
  }

}

module.exports = new Exporter()