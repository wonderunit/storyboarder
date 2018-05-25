const path = require('path')
const util = require('../utils/index')

const boardFileImageSize = boardFileData =>
  (boardFileData.aspectRatio >= 1)
    ? [900 * boardFileData.aspectRatio, 900]
    : [900, 900 / boardFileData.aspectRatio]

const boardFilenameForExport = (board, index, basenameWithoutExt) =>
  `${basenameWithoutExt}-board-` + util.zeroFill(5, index + 1) + '.png'

const boardFilenameForThumbnail = board =>
  board.url.replace('.png', '-thumbnail.png')

const boardFilenameForLink = board =>
  board.url.replace('.png', '.psd')

const boardFilenameForLayer = (board, layerKey) =>
  board.url.replace('.png', `-${layerKey}.png`)

const boardFilenameForPosterFrame = (board) =>
  board.url.replace('.png', `-posterframe.jpg`)

// TODO review usage
// array of fixed size, ordered positions
const boardOrderedLayerFilenames = board => {
  let indices = []
  let filenames = []

  // HACK hardcoded
  // see StoryboarderSketchPane#visibleLayersIndices
  for (let [index, name] of [
    [0, 'reference'],
    [1, 'fill'],
    [2, 'tone'],
    [3, 'pencil'],
    [4, 'ink'],
    [6, 'notes']
  ]) {
    if (board.layers && board.layers[name]) {
      indices.push(index)
      filenames.push(board.layers[name].url)
    }
  }
  
  return { indices, filenames }
}

// TODO clean data on load, instead of converting string-to-number here
const boardDuration = (scene, board) =>
  board.duration != null
    ? Number(board.duration)
    : Number(scene.defaultBoardTiming)

const boardDurationWithAudio = (scene, board) =>
  Math.max(
    board.audio && board.audio.duration ? board.audio.duration : 0,
    boardDuration(scene, board)
  )

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
  // TODO base on board number instead of external index information
  board.url = 'board-' + (index + 1) + '-' + board.uid + '.png'

  for (let name of Object.keys(board.layers)) {
    board.layers[name].url = boardFilenameForLayer(board, name)
  }

  return board
}

// calculate link filename from url filename, preserving link extension
const getUpdatedLinkFilename = board => {
  return path.basename(board.url, path.extname(board.url)) + path.extname(board.link)
}

const getMediaDescription = board => {
  return {
    // does board layers exist and is it not an empty object?
    layers: (board.layers && Object.keys(board.layers).length > 1)
      // return all the layer filenames
      ? Object.entries(board.layers).reduce((coll, [name, layer]) => {
        return {
          ...coll,
          [name]: layer.url
        }
      }, {})
      : {},
    thumbnail: boardFilenameForThumbnail(board),
    posterframe: boardFilenameForPosterFrame(board),
    link: board.link == null ? undefined : board.link.filename,
    audio: board.audio == null ? undefined : board.audio.filename
  }
}

const getMediaFilenames = board => {
  let media = getMediaDescription(board)
  return [
    ...Object.values(media.layers),
    media.thumbnail,
    media.posterframe,
    media.link,
    media.audio
  ].reduce((coll, value) => {
    if (value) coll.push(value)
    return coll
  }, [])
}

module.exports = {
  boardFileImageSize,
  boardFilenameForExport,
  boardFilenameForThumbnail,
  boardFilenameForLink,
  boardFilenameForLayer,
  boardFilenameForPosterFrame,
  boardOrderedLayerFilenames,
  boardDuration,
  boardDurationWithAudio,

  getUpdatedLinkFilename,

  assignUid,
  setup,
  updateUrlsFromIndex,

  getMediaDescription,
  getMediaFilenames
}
