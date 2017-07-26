const fs = require('fs')
const path = require('path')
const trash = require('trash')

const boardModel = require('../models/board')

const cleanupScene = (absolutePathToStoryboarderFile, absolutePathToImagesFolder, trashFn = trash) => {
  return new Promise((resolve, reject) => {
    let originalBoardData = JSON.parse(fs.readFileSync(absolutePathToStoryboarderFile))

    const {
      renamablePairs,
      boardData
    } = prepareCleanup(originalBoardData)

    try {
      // rename the renamable files
      for (let p of renamablePairs) {
        let from = path.join(absolutePathToImagesFolder, p.from)
        let   to = path.join(absolutePathToImagesFolder, p.to)
        fs.renameSync(from, to)
      }

      // find unused files
      const usedFiles = boardData.boards.map(boardModel.boardOrderedLayerFilenames).reduce((a, b) => [...a, ...b.filenames], [])
      const allFiles = fs.readdirSync(absolutePathToImagesFolder)
      const unusedFiles = allFiles.filter(filename => !usedFiles.includes(filename))
      const absolutePathToUnusedFiles = unusedFiles.map(filename => path.join(absolutePathToImagesFolder, filename))

      // delete unused files ...
      trashFn(absolutePathToUnusedFiles).then(() => {

        // ... then, save JSON
        fs.writeFileSync(absolutePathToStoryboarderFile, JSON.stringify(boardData, null, 2))
      
        resolve()
      }).catch(err => {
        reject(err)
      })

    } catch (err) {
      reject(err)
    }
  })
}

const prepareCleanup = boardData => {
// rename each file to match its actual position in the list of boards
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

  let renamablePairs = Array.prototype.concat(...result)  // flatten
                        .filter(p => p.from !== p.to)     // exclude files that don't need to be renamed

  return {
    renamablePairs,
    boardData
  }
}

module.exports = {
  cleanupScene,

  prepareCleanup
}
