const fs = require('fs')
const path = require('path')

const util = require('../utils')

// data functions
const boardFileImageSize = boardFileData =>
  (boardFileData.aspectRatio >= 1)
    ? [900 * boardFileData.aspectRatio, 900]
    : [900, 900 / boardFileData.aspectRatio]

const msecsToFrames = (fps, value) =>
  (fps/1000) * value

// array of fixed size, ordered positions
const boardOrderedLayerFilenames = board => {
  let filenames = []

  // reference
  filenames.push(
    (board.layers && board.layers.reference)
    ? board.layers.reference.url
    : null
  )

  // main
  filenames.push(board.url)

  // notes
  filenames.push(
    (board.layers && board.layers.notes)
    ? board.layers.notes.url
    : null
  )
  
  return filenames
}

const boardFilenameForExport = (board, index, basenameWithoutExt) =>
  `${basenameWithoutExt}-board-${index + 1}-` + util.zeroFill(4, index + 1) + '.png'

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

const exportFlattenedBoard = (board, filenameforExport, { size, boardAbsolutePath, outputPath }) => {
  return new Promise(resolve => {
    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d')
    let [ width, height ] = size
    canvas.width = width
    canvas.height = height
    context.fillStyle = 'white'
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)

    drawFlattenedBoardLayersToContext(context, board, boardAbsolutePath).then(() => {
      let imageData = canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
      fs.writeFileSync(path.join(outputPath, filenameforExport), imageData, 'base64')
      resolve()
    }).catch(err => {
      console.error(err)
    })
  })
}

const drawFlattenedBoardLayersToContext = (context, board, boardAbsolutePath) => {
  return new Promise(resolve => {
    let filenames = boardOrderedLayerFilenames(board)

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
          // TODO respect reference opacity
          context.globalAlpha = 1
          context.drawImage(image, 0, 0)
        }
      }
      
      resolve()
    })
  })
}

const ensureExportsPathExists = (boardAbsolutePath) => {
  let dirname = path.dirname(boardAbsolutePath)

  let exportsPath = path.join(dirname, 'exports')

  if (!fs.existsSync(exportsPath)) {
    fs.mkdirSync(exportsPath)
  }
  
  return exportsPath
}

module.exports = {
  boardFileImageSize,
  boardFilenameForExport,
  msecsToFrames,

  getImage,
  exportFlattenedBoard,
  ensureExportsPathExists
}
