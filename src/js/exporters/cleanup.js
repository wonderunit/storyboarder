const fs = require('fs')
const path = require('path')
const trash = require('trash')

const boardModel = require('../models/board')
const util = require('../utils')

const zip = (a, b) => a.map((v, n) => [v, b[n]])

const flatten = arr => Array.prototype.concat(...arr)

const cleanupScene = (absolutePathToStoryboarderFile, trashFn = trash) => {
  return new Promise((resolve, reject) => {
    let absolutePathToImagesFolder = path.resolve(path.join(path.dirname(absolutePathToStoryboarderFile), 'images'))
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
      const usedFiles = flatten(boardData.boards.map(boardModel.getAllFilenames))

      const allFiles = fs.readdirSync(absolutePathToImagesFolder)
      const unusedFiles = allFiles.filter(filename => !usedFiles.includes(filename))

      const absolutePathToUnusedFiles = unusedFiles.map(filename => path.join(absolutePathToImagesFolder, filename))

      // delete unused files ...
      trashFn(absolutePathToUnusedFiles).then(() => {

        // ... then, save JSON
        fs.writeFileSync(absolutePathToStoryboarderFile, JSON.stringify(boardData, null, 2))
      
        resolve(boardData)
      }).catch(err => {
        reject(err)
      })

    } catch (err) {
      reject(err)
    }
  })
}

const prepareCleanup = boardData => {
  let originalData = boardData
  let cleanedData = util.stringifyClone(boardData)
  cleanedData.boards = cleanedData.boards.map(boardModel.updateUrlsFromIndex)
  // TODO could update board number?
  // TODO could update shot index? see renderThumbnailDrawer

  let pairs = zip(originalData.boards, cleanedData.boards)

  let layerFilenamePairs = flatten(pairs.map(([o, c]) => {
      let filenamesO = boardModel.boardOrderedLayerFilenames(o).filenames
      let filenamesC = boardModel.boardOrderedLayerFilenames(c).filenames
      return zip(filenamesO, filenamesC)
    }))

  let thumbnailPairs = zip(
    originalData.boards.map(boardModel.boardFilenameForThumbnail),
     cleanedData.boards.map(boardModel.boardFilenameForThumbnail)
   )
  
  // concat
  let filePairs = [...layerFilenamePairs, ...thumbnailPairs]
    .filter(([a, b]) => a !== b)     // exclude files that don't need to be renamed
    .map(([a, b]) => ({ from: a, to: b }))

  let renamablePairs = filePairs

  return {
    renamablePairs,
    boardData: cleanedData
  }
}

module.exports = {
  cleanupScene,

  prepareCleanup
}
