const util = require('../utils/index.js')

const boardFileImageSize = boardFileData =>
  (boardFileData.aspectRatio >= 1)
    ? [900 * boardFileData.aspectRatio, 900]
    : [900, 900 / boardFileData.aspectRatio]

const boardFilenameForExport = (board, index, basenameWithoutExt) =>
  `${basenameWithoutExt}-board-` + util.zeroFill(5, index + 1) + '.png'

const boardFilenameForThumbnail = board =>
  board.url.replace('.png', '-thumbnail.png')

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

const assignUid = board => {
  board.uid = util.uidGen(5)
  return board
}

const setup = board => {
  board.layers = board.layers || {} // TODO is this necessary?

  // set some basic data for the new board
  board.newShot = board.newShot || false
  board.lastEdited = Date.now()

  return board
}

const updateUrlsFromIndex = (board, index) => {
  board.url = 'board-' + (index + 1) + '-' + board.uid + '.png'

  if (board.layers.reference) {
    board.layers.reference.url = board.url.replace('.png', '-reference.png')
  }

  if (board.layers.notes) {
    board.layers.notes.url = board.url.replace('.png', '-notes.png')
  }

  return board
}

module.exports = {
  boardFileImageSize,
  boardFilenameForExport,
  boardFilenameForThumbnail,
  boardOrderedLayerFilenames,

  assignUid,
  setup,
  updateUrlsFromIndex
}