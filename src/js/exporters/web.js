const archiver = require('archiver')
const fs = require('fs-extra')
const moment = require('moment')
const path = require('path')
const remote = require('@electron/remote')
const request = require('request-promise-native')

const boardModel = require('../models/board')
const exporterCommon = require('./common')
const exporterFfmpeg = require('./ffmpeg')
const { fitToDst } = require('../utils')

const prefsModule = remote.require(path.join(__dirname, '..', 'prefs'))

// const API_URI = 'http://localhost:8080/api'
const API_URI = 'https://storyboarders.com/api'

const exportForWeb = async (srcFilePath, outputFolderPath) => {
  console.log('exportForWeb')
  try {
    // read the scene
    let scene = JSON.parse(fs.readFileSync(srcFilePath))

    fs.ensureDirSync(outputFolderPath)

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
    if (spritableBoards.length === 1) {
      // can't use hstack for less than 2
      // ignore filterArgs
      args = args.concat([
        '-filter_complex', '[0:v]scale=-1:200[v]',

        '-map', '[v]',

        dst
      ])
    } else {
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
    }
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

const uploadToWeb = async sceneFilePath => {
  let sceneDirPath = path.dirname(sceneFilePath)

  let basename = path.basename(sceneFilePath, path.extname(sceneFilePath))
  let timestamp = moment().format('YYYY-MM-DD hh.mm.ss')
  let outputFolderPath = path.join(sceneDirPath, 'exports', `${basename}-web-${timestamp}`)
  let zipFilePath = path.join(path.dirname(outputFolderPath), `${path.basename(outputFolderPath)}.zip`)

  try {
    await exportForWeb(sceneFilePath, outputFolderPath)

    let writer = new Promise((resolve, reject) => {
      let output = fs.createWriteStream(zipFilePath)
      let archive = archiver('zip', {
        zlib: { level: 9 } // compression level
      })
      // listen for all archive data to be written
      output.on('close', function () {
        resolve()
      })
      // good practice to catch warnings (ie stat failures and other non-blocking errors)
      archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
          // throw error
          reject(err)
        } else {
          // throw error
          reject(err)
        }
      })
      // good practice to catch this error explicitly
      archive.on('error', function (err) {
        reject(err)
      })
      // pipe archive data to the file
      archive.pipe(output)

      // append files from a directory, putting its contents at the root of archive
      archive.directory(outputFolderPath, false)

      // finalize the archive (ie we are done appending files but streams have to finish yet)
      archive.finalize()
    })

    await writer

    // remote.shell.showItemInFolder(outputFolderPath)

    let url = `${API_URI}/upload`

    let scene = JSON.parse(fs.readFileSync(sceneFilePath))

    let formData = {
      title: path.basename(sceneFilePath, path.extname(sceneFilePath)),
      // description: TODO populate from form

      // TODO use audio duration
      duration: scene.boards[scene.boards.length - 1].time +
                boardModel.boardDuration(scene, scene.boards[scene.boards.length - 1]),
      boards: scene.boards.length,
      width: Math.round(scene.aspectRatio * 720), // 1721,
      height: 720,
      zip: fs.createReadStream(zipFilePath)
    }

    let token = prefsModule.getPrefs().auth.token

    let res = await request
      .post({ url, formData, resolveWithFullResponse: true })
      .auth(null, null, true, token)

    let json = JSON.parse(res.body)

    console.log('Upload OK')
    console.log('message:', json.message, 'id:', json.id)

    prefsModule.set('auth', {
      token: json.renewedToken
    })

    return json
  } catch (err) {
    console.error(err)
    throw err
  }
}

module.exports = {
  API_URI,

  exportForWeb,
  uploadToWeb
}
