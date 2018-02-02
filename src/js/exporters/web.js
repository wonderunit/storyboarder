const fs = require('fs-extra')
const path = require('path')

const boardModel = require('../models/board')
const exporterCommon = require('./common')
const exporterFfmpeg = require('./ffmpeg')

const exportForWeb = async (srcFilePath, outputFolderPath) => {
  console.log('exportForWeb')
  try {
    // read the scene
    let scene = JSON.parse(fs.readFileSync(srcFilePath))

    if (!fs.existsSync(outputFolderPath)) {
      fs.mkdirSync(outputFolderPath)
    }

    let writers = []
    let index = 0
    let basenameWithoutExt = path.basename(srcFilePath, path.extname(srcFilePath))
    for (let board of scene.boards) {
      writers.push(new Promise(async resolve => {
        try {
          let filenameForExport = path.basename(
            boardModel.boardFilenameForExport(board, index, basenameWithoutExt),
            '.png'
          ) + '.jpg'

          let originalSize = boardModel.boardFileImageSize(scene)

          let fit = fitToDst(
            { width: Infinity, height: 720 },
            { width: originalSize[0], height: originalSize[1] }
          )
          let reducedSize = [fit[2], fit[3]].map(Math.round)

          let jpegQuality = 0.5

          console.log({
            board,
            filenameForExport,
            originalSize,
            reducedSize,
            srcFilePath,
            outputFolderPath,
            jpegQuality
          })

          await exporterCommon.exportFlattenedBoard(
            board,
            filenameForExport,
            reducedSize,
            srcFilePath,
            outputFolderPath,
            jpegQuality
          )

          resolve()
        } catch (err) {
          console.log(err.message)
          resolve()
        }
      }))
      index++
    }
    await Promise.all(writers)

    let audioWriters = []
    for (let board of scene.boards) {
      if (board.audio) {
        audioWriters.push(new Promise(async resolve => {
          try {
            let src = path.join(path.dirname(srcFilePath), 'images', board.audio.filename)
            let dst = path.join(outputFolderPath, path.basename(board.audio.filename, '.wav') + '.mp4')

            let args = [
              // Input #0
              '-i', src,

              // mono, via https://trac.ffmpeg.org/wiki/AudioChannelManipulation
              '-ac', '1',

              // low bitrate
              '-b:a', '64k',

              // Output
              dst
            ]
            await exporterFfmpeg.convert(null, args)

            resolve()
          } catch (err) {
            console.log(err)
            console.log(err.message)
            resolve()
          }
        }))
      }
      index++
    }
    await Promise.all(audioWriters)

    //
    //
    // export main thumbnail
    //
    let board = scene.boards[0]
    let filenameForExport = 'thumbnail.jpg'

    let originalSize = boardModel.boardFileImageSize(scene)

    let fit = fitToDst(
      { width: Infinity, height: 400 },
      { width: originalSize[0], height: originalSize[1] }
    )
    let reducedSize = [fit[2], fit[3]].map(Math.round)

    let jpegQuality = 0.5

    await exporterCommon.exportFlattenedBoard(
      board,
      filenameForExport,
      reducedSize,
      srcFilePath,
      outputFolderPath,
      jpegQuality
    )
    //
    //
    //

    index = 0
    for (let board of scene.boards) {
      board.url = path.basename(
        boardModel.boardFilenameForExport(board, index, basenameWithoutExt),
        '.png'
      ) + '.jpg'

      // TODO layers? remove?

      if (board.audio) {
        board.audio.filename = path.basename(
          board.audio.filename,
          '.wav'
        ) + '.mp4'
      }
      index++
    }

    //
    //
    // sprite sheet
    //
    // FIXME should grab from flattened PNG instead of JPG
    //
    let dst = path.join(outputFolderPath, 'thumbnailanim.jpg')
    let args = []
    let filterArgs = []
    let n = 0
    let spritableBoards = JSON.parse(JSON.stringify(scene.boards)) // make a clone
    if (spritableBoards.length > 10) {
      // TODO make a better sampling instead of chopping off the remainder :/
      spritableBoards = spritableBoards.slice(0, 10)
    }
    for (let board of spritableBoards) {
      let jpgPath = path.join(
        outputFolderPath,
        path.basename(board.url) // NOTE modified, will grab from JPG
      )
      args = args.concat([ '-i', jpgPath ])
      // https://trac.ffmpeg.org/wiki/Scaling
      // scale: rescale to 200 px height
      filterArgs.push(`[${n}:v]scale=-1:200[s${n}];`)
      n++
    }
    args = args.concat([
      // hstack: assemble horizontally
      '-filter_complex', filterArgs.join('') +
                         filterArgs.map((f, n) => `[s${n}]`).join('') +
                         // via https://stackoverflow.com/a/47137307
                         `hstack=${filterArgs.length}[v]`,

      '-map', '[v]',

      // Output
      dst
    ])
    console.log('\n\n\n\n\n\n')
    console.log('-----')
    console.log(args)
    console.log('\n\n\n\n\n\n')
    await exporterFfmpeg.convert(null, args)

    //
    //
    //

    //
    //
    // write the modified scene
    fs.writeFileSync(path.join(outputFolderPath, 'main.storyboarder'), JSON.stringify(scene, null, 2))
  } finally {
    console.log('Done!')
  }
}

module.exports = {
  exportForWeb
}

// TODO make these shared util fns instead of copying from `main-window.js`

// via https://stackoverflow.com/questions/6565703/math-algorithm-fit-image-to-screen-retain-aspect-ratio
//
// Image data: (wi, hi) and define ri = wi / hi
// Screen resolution: (ws, hs) and define rs = ws / hs
//
// rs > ri ? (wi * hs/hi, hs) : (ws, hi * ws/wi)
//
// top = (hs - hnew)/2
// left = (ws - wnew)/2

const fitToDst = (dst, src) => {
  let wi = src.width
  let hi = src.height
  let ri = wi / hi

  let ws = dst.width
  let hs = dst.height
  let rs = ws / hs

  let [wnew, hnew] = rs > ri ? [wi * hs / hi, hs] : [ws, hi * ws / wi]

  let x = (ws - wnew) / 2
  let y = (hs - hnew) / 2

  return [x, y, wnew, hnew]
}

