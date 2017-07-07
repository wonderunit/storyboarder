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
  let indices = []
  let filenames = []

  // reference
  if (board.layers && board.layers.reference) {
    indices.push(0)
    filenames.push(board.layers.reference.url)
  }

  // main
  indices.push(1)
  filenames.push(board.url)

  // notes
  if (board.layers && board.layers.notes) {
    indices.push(3)
    filenames.push(board.layers.notes.url)
  }
  
  return { indices, filenames }
}

const boardFilenameForThumbnail = board =>
  board.url.replace('.png', '-thumbnail.png')

const boardFilenameForExport = (board, index, basenameWithoutExt) =>
  `${basenameWithoutExt}-board-${index + 1}-` + util.zeroFill(4, index + 1) + '.png'

const getImage = (url) => {
  return new Promise(function(resolve, reject){
    let img = new Image()
    img.onload = () => {
      resolve(img)
    }
    // TODO test a rejection
    img.onerror = () => {
      console.log('error loading image')
      reject(null)
    }
    img.src = url
  })
}

const exportFlattenedBoard = (board, filenameForExport, { size, projectAbsolutePath, outputPath }) => {
  return new Promise(resolve => {
    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d')
    let [ width, height ] = size
    canvas.width = width
    canvas.height = height
    context.fillStyle = 'white'
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)

    drawFlattenedBoardLayersToContext(context, board, projectAbsolutePath, size).then(() => {
      let imageData = canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
      let pathToExport = path.join(outputPath, filenameForExport)
      fs.writeFileSync(pathToExport, imageData, 'base64')
      resolve(pathToExport)
    }).catch(err => {
      console.error(err)
    })
  })
}

const drawFlattenedBoardLayersToContext = (context, board, projectAbsolutePath, size) => {
  return new Promise(resolve => {
    let { indices, filenames } = boardOrderedLayerFilenames(board)

    let loaders = []
    for (let filename of filenames) {
      let imageFilePath = path.join(path.dirname(projectAbsolutePath), 'images', filename)
      loaders.push(getImage(imageFilePath))
    }

    Promise.all(loaders).then(images => {

      let canvasImageSourcesData = []

      images.forEach((canvasImageSource, n) => {
        // let layerIndex = indices[n]
        if (canvasImageSource) {
          canvasImageSourcesData.push({
            canvasImageSource,
            opacity: 1
          })
        }
      })

      flattenBoardToContext(context, canvasImageSourcesData, size)

      resolve()
    }).catch(err => {
      console.error(err)
    })
  })
}

const flattenBoardToContext = (context, canvasImageSourcesData, size) => {
  context.save()
  for (let source of canvasImageSourcesData) {
    context.globalAlpha = source.opacity
    context.drawImage(source.canvasImageSource, 0, 0, size[0], size[1])
  }
  context.restore()
}

const ensureExportsPathExists = (projectAbsolutePath) => {
  let dirname = path.dirname(projectAbsolutePath)

  let exportsPath = path.join(dirname, 'exports')

  if (!fs.existsSync(exportsPath)) {
    fs.mkdirSync(exportsPath)
  }
  
  return exportsPath
}

module.exports = {
  boardFileImageSize,
  boardFilenameForExport,
  boardFilenameForThumbnail,
  msecsToFrames,

  getImage,
  exportFlattenedBoard,
  ensureExportsPathExists
}
