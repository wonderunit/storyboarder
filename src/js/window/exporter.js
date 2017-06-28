const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const path = require('path')
const GIFEncoder = require('gifencoder')
const moment = require('moment')

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

  exportFcp (boardData, boardAbsolutePath) {
    let dirname = path.dirname(boardAbsolutePath)
    let basename = path.basename(boardAbsolutePath)

    let exportsPath = path.join(dirname, 'exports')

    if (!fs.existsSync(exportsPath)) {
      fs.mkdirSync(exportsPath)
    }

    let outputPath = path.join(
      exportsPath,
      basename + ' Final Cut Pro X ' + moment().format('YYYY-MM-DD hh.mm.ss')
    )
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath)
    }

    let xml = exporterFcp.generateFinalCutProXml(exporterFcp.generateFinalCutProData(boardData))
    fs.writeFileSync(path.join(outputPath, basename + '.fcpxml'), xml)

    return outputPath
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