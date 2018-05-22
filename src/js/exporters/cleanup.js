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
      // rename the renamable files (layers, thumbnails, linked files)
      for (let p of [...renamablePairs]) {
        let from = path.join(absolutePathToImagesFolder, p.from)
        let   to = path.join(absolutePathToImagesFolder, p.to)
        if (fs.existsSync(from)) {
          // console.log('rename', p.from, p.to)
          fs.renameSync(from, to)
        } else {
          // console.log('skip', p.from, p.to)
        }
      }

      // if the linked file does not exist, delete it from data
      boardData.boards = boardData.boards.map(b => {
        if (b.link && !fs.existsSync(path.join(absolutePathToImagesFolder, b.link))) {
          // console.log('could not find', b.link)
          // console.log('removing link')
          delete b.link
        }
        return b
      })

      // if the audio file does not exist, delete the audio object from the board data
      boardData.boards.forEach(b => {
        if (b.audio && !fs.existsSync(path.join(absolutePathToImagesFolder, b.audio.filename))) {
          delete b.audio
        }
      })

      //
      //
      // find and delete unused files ...
      //

      // ... first, find all used filenames for: layers, thumbnails, links
      // see also: getMediaFilesUsedByBoard
      const usedFiles = flatten(boardData.boards.map(board => ([
        ...boardModel.boardOrderedLayerFilenames(board).filenames,
        boardModel.boardFilenameForThumbnail(board),
        boardModel.boardFilenameForPosterFrame(board),
        ...(board.link ? [board.link] : []),
        ...(board.audio ? [board.audio.filename] : [])
      ])))

      const allFiles = fs.readdirSync(absolutePathToImagesFolder)
      const unusedFiles = allFiles.filter(filename => !usedFiles.includes(filename))

      const absolutePathToUnusedFiles = unusedFiles.map(filename => path.join(absolutePathToImagesFolder, filename))

      // ... now, delete unused files ...
      trashFn(absolutePathToUnusedFiles).then(() => {

        // ... then, save JSON
        fs.writeFileSync(absolutePathToStoryboarderFile, JSON.stringify(boardData, null, 2))
      
        resolve(boardData)
      }).catch(err => {
        console.error(err)
        reject(err)
      })

    } catch (err) {
      console.error(err)
      reject(err)
    }
  })
}

const prepareCleanup = boardData => {
  let originalData = boardData
  let cleanedData = util.stringifyClone(boardData)
  cleanedData.boards = cleanedData.boards
                        .map(boardModel.updateUrlsFromIndex)
                        .map(b => {
                          if (b.link) {
                            b.link = boardModel.getUpdatedLinkFilename(b)
                          }
                          return b
                        })
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

  let linkPairs = zip(
    originalData.boards.map(b => b.link),
     cleanedData.boards.map(b => b.link)
   )
   linkPairs = linkPairs.filter(pairs => !util.isUndefined(pairs[0]))

  let posterframePairs = zip(
    originalData.boards.map(boardModel.boardFilenameForPosterFrame),
    cleanedData.boards.map(boardModel.boardFilenameForPosterFrame)
  )

  // concat file pairs
  let renamablePairs = [...layerFilenamePairs, ...thumbnailPairs, ...linkPairs, ...posterframePairs]
    .filter(([a, b]) => a !== b) // include only filenames that require renaming
    .map(([a, b]) => ({ from: a, to: b }))

  return {
    renamablePairs,
    boardData: cleanedData
  }
}

module.exports = {
  cleanupScene,

  prepareCleanup
}
