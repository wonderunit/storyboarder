const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const path = require('path')
const GIFEncoder = require('gifencoder')
const moment = require('moment')

const exporterCommon = require('../exporters/common.js')
const exporterFcpX = require('../exporters/final-cut-pro-x.js')
const exporterFcp = require('../exporters/final-cut-pro.js')
const util = require('../utils/index.js')

const getImage = (url) => {
  return new Promise(function(resolve, reject){
    let img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.onerror = () => {
      reject(img)
    }
    img.src = url
  })
}

class Exporter extends EventEmitter {
  constructor () {
    super()
  }

  drawFlattenedBoardLayersToContext (context, board, boardAbsolutePath) {
    return new Promise(resolve => {
      let filenames = exporterCommon.boardOrderedLayerFilenames(board)

      let loaders = []
      for (let filename of filenames) {
        if (filename) {
          let imageFilePath = path.join(path.dirname(boardAbsolutePath), 'images', filename)
          loaders.push(getImage(imageFilePath))
        }
      }
      
      Promise.all(loaders).then(result => {
        for (let image of result) {
          if (image) {
            context.globalAlpha = 1
            context.drawImage(image, 0, 0)
          }
        }
        
        resolve()
      })
    })
  }

  exportFcp (boardData, boardAbsolutePath) {
    return new Promise(resolve => {
      let dirname = path.dirname(boardAbsolutePath)
      let basename = path.basename(boardAbsolutePath)

      let exportsPath = path.join(dirname, 'exports')

      if (!fs.existsSync(exportsPath)) {
        fs.mkdirSync(exportsPath)
      }

      let outputPath = path.join(
        exportsPath,
        basename + ' Exported ' + moment().format('YYYY-MM-DD hh.mm.ss')
      )
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath)
      }

      let xml = exporterFcp.generateFinalCutProXml(exporterFcp.generateFinalCutProData(boardData, { boardAbsolutePath, outputPath }))
      fs.writeFileSync(path.join(outputPath, basename + '.xml'), xml)

      let fcpxml = exporterFcpX.generateFinalCutProXXml(exporterFcpX.generateFinalCutProXData(boardData, { boardAbsolutePath, outputPath }))
      fs.writeFileSync(path.join(outputPath, basename + '.fcpxml'), fcpxml)

      // export ALL layers of each one of the boards
      let index = 0
      let writers = []
      for (let board of boardData.boards) {
        writers.push(new Promise(resolve => {
          let basenameWithoutExt = path.basename(boardAbsolutePath, path.extname(boardAbsolutePath))
          let filenameforExport = exporterCommon.boardFilenameForExport(board, index, basenameWithoutExt)

          let canvas = document.createElement('canvas')
          let context = canvas.getContext('2d')
          let [ width, height ] = exporterCommon.boardFileImageSize(boardData)
          canvas.width = width
          canvas.height = height
          context.fillStyle = 'white'
          context.fillRect(0, 0, context.canvas.width, context.canvas.height)

          this.drawFlattenedBoardLayersToContext(context, board, boardAbsolutePath).then(() => {
            let imageData = canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
            fs.writeFileSync(path.join(outputPath, filenameforExport), imageData, 'base64')
          })
          resolve()
        }))

        index++
      }

      Promise.all(writers).then(() => {
        resolve(outputPath)
      })
    })
  }

  exportAnimatedGif (boards, boardSize, destWidth, boardPath) {
    let canvases = []

    let sequence = Promise.resolve()
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
      encoder.setDelay(2000)  // frame delay in ms
      encoder.setQuality(10) // image quality. 10 is default.
      let canvas = document.createElement('canvas')
      canvas.width = destSize.width
      canvas.height = destSize.height
      let context = canvas.getContext('2d')
      for (var i = 0; i < boards.length; i++) {
        context.fillStyle = 'white'
        context.fillRect(0,0,destSize.width,destSize.height)
        context.drawImage(canvases[i], 0,0,destSize.width,destSize.height)
        let duration
        if (boards[i].duration) {
          duration = boards[i].duration
        } else {
          duration = 2000
        }
        encoder.setDelay(duration)
       encoder.addFrame(context)
      }
      encoder.finish()
      // emit a finish event!
      this.emit('complete', filepath)
    })
  }

}

module.exports = new Exporter()