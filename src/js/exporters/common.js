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

const getImage = url => {
  return new Promise(function(resolve, reject){
    let img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.onerror = () => {
      reject(new Error(`Could not load image ${url}`))
    }
    img.src = url
  })
}

/**
 * Reads layer files and exports flattened image to a file
 * Can be used to generate thumbnails if `size` is smaller than actual size
 * @param {object} board the board object
 * @param {string} filenameForExport filename without path
 * @param {array} size [width:Number, height:Number]
 * @param {string} projectFileAbsolutePath full path to .storyboarder project
 * @param {string} outputPath full path of folder where file will be exported
 * @returns {Promise} resolves with the absolute path to the exported file
 */
const exportFlattenedBoard = (board, filenameForExport, size, projectFileAbsolutePath, outputPath) => {
  return new Promise((resolve, reject) => {

    // TODO can we extract this to a fn?
    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d')
    canvas.width = size[0]
    canvas.height = size[1]

    context.fillStyle = 'white'
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)

    let { indices, filenames } = boardOrderedLayerFilenames(board)

    let loaders = []
    for (let filename of filenames) {
      let imageFilePath = path.join(path.dirname(projectFileAbsolutePath), 'images', filename)
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

      let imageData = canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
      let pathToExport = path.join(outputPath, filenameForExport)
      fs.writeFileSync(pathToExport, imageData, 'base64')
      resolve(pathToExport)
    }).catch(err => {
      reject(new Error(err))
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

const ensureExportsPathExists = (projectFileAbsolutePath) => {
  let dirname = path.dirname(projectFileAbsolutePath)

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
  flattenBoardToContext,
  ensureExportsPathExists
}
