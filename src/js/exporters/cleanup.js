const boardModel = require('../models/board')

// rename each file to match its actual position in the list of boards
const cleanupScene = boardData => {
  // get a copy of the source filenames
  let original = boardData.boards.map(boardModel.boardOrderedLayerFilenames)

  // update all the urls
  boardData.boards = boardData.boards.map(boardModel.updateUrlsFromIndex)
    // TODO could update board number?
    // TODO could update shot index? see renderThumbnailDrawer

  // get a copy of the destination filenames
  let renamed = boardData.boards.map(boardModel.boardOrderedLayerFilenames)

  // find source and destination
  let result = original.map((o, n) => {
    r = renamed[n]
    return o.filenames.map((from, i) => {
      let to = r.filenames[i]
      return { from, to }
    })
  })

  // flatten
  let renameablePairs = Array.prototype.concat(...result)

  return {
    renameablePairs,
    boardData
  }
}

module.exports = {
  cleanupScene
}
