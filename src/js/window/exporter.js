const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const path = require('path')
const GIFEncoder = require('gifencoder')
const moment = require('moment')
const app = require("electron").remote.app
const { dialog } = require('electron').remote

const {
  boardFileImageSize,
  boardFilenameForExport
} = require('../models/board')
const {
  getImage,
  exportFlattenedBoard,
  ensureExportsPathExists,
  flattenBoardToCanvas
} = require('../exporters/common.js')

const exporterFcpX = require('../exporters/final-cut-pro-x.js')
const exporterFcp = require('../exporters/final-cut-pro.js')
const exporterPDF = require('../exporters/pdf.js')
const exporterCleanup = require('../exporters/cleanup.js')
const util = require('../utils/index.js')

class Exporter extends EventEmitter {
  constructor () {
    super()
  }
  
  exportCleanup (boardData, projectFileAbsolutePath) {
    return new Promise((resolve, reject) => {
      dialog.showMessageBox(
        null,
        {
          type: 'warning',
          title: 'Are You Sure?',
          message: `Clean Up deletes unused image files, reducing filesize. It cannot be undone. Are you sure you want to do this?`,
          buttons: ['Yes', 'No'],
        },
        index => {
          if (index == 1) {
            reject()
          } else {
            exporterCleanup.cleanupScene(projectFileAbsolutePath).then(newBoardData => {
              resolve(newBoardData)
            }).catch(err => {
              reject(err)
            })
          }
        }
      )
    })
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
    let aspect = boardSize.height / boardSize.width
    let destSize = {width: destWidth, height: Math.floor(destWidth*aspect)}
    let fragmentText = (ctx, text, maxWidth) => {
      let words = text.split(' '),
        lines = [],
        line = ""
      if (ctx.measureText(text).width < maxWidth) {
        return [text]
      }
      while (words.length > 0) {
        while (ctx.measureText(words[0]).width >= maxWidth) {
          var tmp = words[0]
          words[0] = tmp.slice(0, -1)
          if (words.length > 1) {
            words[1] = tmp.slice(-1) + words[1]
          } else {
            words.push(tmp.slice(-1))
          }
        }
        if (ctx.measureText(line + words[0]).width < maxWidth) {
          line += words.shift() + " "
        } else {
          lines.push(line)
          line = ""
        }
        if (words.length === 0) {
          lines.push(line)
        }
      }
      return lines
    }
    getImage('./img/watermark.png').then( (watermarkImage) => {
      boards.forEach((board)=> {
        let canvas = flattenBoardToCanvas(board, null, [destSize.width, destSize.height], path.join(boardPath, 't.storyboarder'))
        canvases.push(canvas)
      })
      Promise.all(canvases).then((values) => {
        let encoder = new GIFEncoder(destSize.width, destSize.height)
        // save in the boards directory
        let filename = boardPath.split(path.sep)
        filename = filename[filename.length-1]
        if (!fs.existsSync(path.join(boardPath, 'exports'))) {
          fs.mkdirSync(path.join(boardPath, 'exports'))
        }
        let filepath = path.join(boardPath, 'exports', filename + ' ' + moment().format('YYYY-MM-DD hh.mm.ss') + '.gif')
        encoder.createReadStream().pipe(fs.createWriteStream(filepath))
        encoder.start()
        encoder.setRepeat(0)   // 0 for repeat, -1 for no-repeat
        encoder.setDelay(boardData.defaultBoardTiming)  // frame delay in ms
        encoder.setQuality(10) // image quality. 10 is default.
        for (var i = 0; i < boards.length; i++) {
          let canvas = values[i]
          let context = canvas.getContext('2d')
          if (mark) {
            context.drawImage(watermarkImage,destSize.width-watermarkImage.width,destSize.height-watermarkImage.height)
          }
          if (boards[i].dialogue) {
            let text = boards[i].dialogue
            let fontSize = 22
            context.font = "300 " + fontSize + "px proximanova";
            context.textAlign = "center";
            context.fillStyle = "white"
            context.miterLimit = 1
            context.lineJoin = "round"
            context.lineWidth = 4
            let lines = fragmentText(context, text, 450)

            let outlinecanvas = document.createElement('canvas')
            let outlinecontext = outlinecanvas.getContext('2d')
            outlinecanvas.width = destSize.width
            outlinecanvas.height = destSize.height

            lines.forEach((line, i)=> {
              let xOffset = (i + 1) * (fontSize + 6) + (destSize.height - ((lines.length+1) * (fontSize + 6)))-20
              let textWidth = context.measureText(line).width/2
              outlinecontext.lineWidth = 15
              outlinecontext.lineCap = "square"
              outlinecontext.lineJoin = "round"
              outlinecontext.strokeStyle = "rgba(0,0,0,1)"
              let padding = 35
              outlinecontext.fillRect((destWidth/2)-textWidth-(padding/2), xOffset-(6)-(padding/2), textWidth*2+padding, padding)
              outlinecontext.strokeRect((destWidth/2)-textWidth-(padding/2), xOffset-(6)-(padding/2), textWidth*2+padding, padding)


              // outlinecontext.beginPath()
              // outlinecontext.moveTo((destWidth/2)-textWidth, xOffset-(6))
              // outlinecontext.lineTo((destWidth/2)+textWidth, xOffset-(6))
              // outlinecontext.stroke()
            })

            context.globalAlpha = 0.5
            context.drawImage(outlinecanvas, 0, 0)
            context.globalAlpha = 1

            lines.forEach((line, i)=> {
              let xOffset = (i + 1) * (fontSize + 6) + (destSize.height - ((lines.length+1) * (fontSize + 6)))-20
              context.lineWidth = 4
              context.strokeStyle = "rgba(0,0,0,0.8)"
              context.strokeText(line.trim(), destWidth/2, xOffset)
              context.strokeStyle = "rgba(0,0,0,0.2)"
              context.strokeText(line.trim(), destWidth/2, xOffset+2)
              context.fillText(line.trim(), destWidth/2,xOffset)
            })
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