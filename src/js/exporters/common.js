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

module.exports = {
  boardFileImageSize,
  boardOrderedLayerFilenames,
  boardFilenameForExport,
  msecsToFrames
}
