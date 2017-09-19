const fs = require('fs')
const path = require('path')
const moment = require('moment')

const {
  boardFileImageSize,
  boardFilenameForExport,
  boardOrderedLayerFilenames
} = require('../models/board')

const util = require('../utils')

const DEFAULT_REFERENCE_LAYER_OPACITY = 0.75

const msecsToFrames = (fps, value) =>
  (fps/1000) * value

const getImage = url => {
  return new Promise((resolve, reject) => {
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
 * @param {array} size [width:int, height:int]
 * @param {string} projectFileAbsolutePath full path to .storyboarder project
 * @param {string} outputPath full path of folder where file will be exported
 * @returns {Promise} resolves with the absolute path to the exported file
 */
const exportFlattenedBoard = (board, filenameForExport, size, projectFileAbsolutePath, outputPath, jpegQuality=null) => {
  return new Promise((resolve, reject) => {

    let canvas = createWhiteContext(size).canvas

    flattenBoardToCanvas(board, canvas, size, projectFileAbsolutePath)
      .then(() => {
        let imageData
        if (jpegQuality) {
          imageData = canvas.toDataURL('image/jpeg', jpegQuality).replace(/^data:image\/\w+;base64,/, '')
        } else {
          imageData = canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
        }
        let pathToExport = path.join(outputPath, filenameForExport)
        fs.writeFileSync(pathToExport, imageData, 'base64')
        resolve(pathToExport)
      }).catch(err => {
        reject(err)
      })
  })
}

const createWhiteContext = size => {
  let canvas = document.createElement('canvas')
  let context = canvas.getContext('2d')
  canvas.width = size[0]
  canvas.height = size[1]
  context.fillStyle = 'white'
  context.fillRect(0, 0, context.canvas.width, context.canvas.height)
  return context
}

// convert board data to canvasImageSourcesData
const getCanvasImageSourcesDataForBoard = (board, projectFileAbsolutePath) => {
  return new Promise((resolve, reject) => {
    let { indices, filenames } = boardOrderedLayerFilenames(board)

    let getImageFilePath = (filename) => path.join(path.dirname(projectFileAbsolutePath), 'images', filename)

    let loaders = filenames.map(filename => getImage(getImageFilePath(filename)))

    Promise.all(loaders).then(images => {
      let canvasImageSourcesData = []
      images.forEach((canvasImageSource, n) => {
        let layerIndex = indices[n]
        if (canvasImageSource) {

          // default opacity for all layers is 1
          let opacity = 1

          // special case for reference layer
          if (layerIndex === 0) {
            if (board.layers &&
                board.layers.reference &&
                !util.isUndefined(board.layers.reference.opacity))
            {
              // ... if defined, use that opacity value
              opacity = board.layers.reference.opacity
            } else {
              // ... otherwise, use default for reference layer
              opacity = DEFAULT_REFERENCE_LAYER_OPACITY
            }
          }

          canvasImageSourcesData.push({
            // layerIndex,
            canvasImageSource,
            opacity
          })
        }
      })
      resolve(canvasImageSourcesData)
    }).catch(err => {
      reject(new Error(err))
    })
  })
}

/**
 * Given an given an array of layer description objects (CanvasImageSourcesData),
 *  draws a flattened image to the context
 * @param {CanvasRenderingContext2D} context reference to the destination context
 * @param {array} canvasImageSourcesData array of layer description objects: { canvasImageSource:CanvasImageSource, opacity:int }:CanvasImageSourcesData
 * @param {array} size [width:int, height:int]
 */
const flattenCanvasImageSourcesDataToContext = (context, canvasImageSourcesData, size) => {
  context.save()
  for (let source of canvasImageSourcesData) {
    context.globalAlpha = source.opacity
    context.drawImage(source.canvasImageSource, 0, 0, size[0], size[1])
  }
  context.restore()
}

/**
 * Reads layer files and draws flattened image to a canvas
 * Can be used to generate thumbnails if `size` is smaller than actual size
 * @param {object} board the board object
 * @param {HTMLCanvasElement} canvas destination canvas
 * @param {array} size [width:int, height:int]
 * @param {string} projectFileAbsolutePath full path to .storyboarder project
 * @returns {Promise}
 */
const flattenBoardToCanvas = (board, canvas, size, projectFileAbsolutePath) => {
  return new Promise((resolve, reject) => {
    if (!canvas) { canvas = createWhiteContext(size).canvas }
    getCanvasImageSourcesDataForBoard(board, projectFileAbsolutePath)
      .then(canvasImageSourcesData => {
        flattenCanvasImageSourcesDataToContext(canvas.getContext('2d'), canvasImageSourcesData, size)
        resolve(canvas)
      }).catch(err => {
        reject(err)
      })
  })
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
  DEFAULT_REFERENCE_LAYER_OPACITY,

  msecsToFrames,
  getImage,
  exportFlattenedBoard,
  flattenCanvasImageSourcesDataToContext,
  flattenBoardToCanvas,
  ensureExportsPathExists
}
