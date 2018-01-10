const electronUtil = require('electron-util')
const execa = require('execa')
const ffmpeg = require('@ffmpeg-installer/ffmpeg')
const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')

const boardModel = require('../models/board')
const exporterCommon = require('../exporters/common')

const ffmpegPath = electronUtil.fixPathForAsarUnpack(ffmpeg.path)

// const durationRegex = /Duration: (\d\d:\d\d:\d\d.\d\d)/gm
// const frameRegex = /frame=\s+(\d+)/gm

const checkVersion = async () =>
  new Promise((resolve, reject) => {
    let matchedVersion

    const process = execa(ffmpegPath, [
      '-version'
    ])
    process.stdout.on('data', data => {
      data = data.toString().trim()
      const matchesVersion = data.match(/^ffmpeg version (\S+)/)
      if (matchesVersion) {
        matchedVersion = matchesVersion[1]
      }
    })
    process.on('error', reject)
    process.on('exit', code => {
      if (code === 0) {
        resolve(matchedVersion)
      } else {
        reject(new Error(`Could not use ffmpeg. Failed with error ${code}`))
      }
    })
    process.catch(reject)
  })

// via https://github.com/wulkano/kap/blob/5769d76587/app/src/scripts/convert.js
const convert = async (outputPath, opts, args) =>
  new Promise((resolve, reject) => {
    const converter = execa(ffmpegPath, args)
    let amountOfFrames

    converter.stderr.on('data', data => {
      data = data.toString().trim()

      //
      // FIXME this doesn't work because ffmpeg doesn't report the correct Duration
      //         actual Duration would be Input #0's Duration (the ffconcat stream)
      //          OR, the time + duration of the final audio
      //           (whichever is greater)
      //
      // const matchesDuration = durationRegex.exec(data)
      // const matchesFrame = frameRegex.exec(data)
      // 
      // if (matchesDuration) {
      //   amountOfFrames = Math.ceil(moment.duration(matchesDuration[1]).asSeconds() * 30)
      // } else if (matchesFrame) {
      //   const currentFrame = matchesFrame[1]
      //   opts.progressCallback(currentFrame / amountOfFrames)
      // }

      // for debugging
      console.log(data)
    })
    converter.on('error', reject)
    converter.on('exit', code => {
      if (code === 0) {
        resolve(outputPath)
      } else {
        reject(new Error(`Could not use ffmpeg. Failed with error ${code}`))
      }
    })
    converter.catch(reject)
  })

const convertToVideo = async opts => {
  const { outputPath, sceneFilePath, scene } = opts

  // export flattened boards to output path
  console.log('exporting images and audio for output …')
  let writers = scene.boards.map(async board =>
    await exporterCommon.exportFlattenedBoard(
      board,
      board.url,
      boardModel.boardFileImageSize(scene),
      sceneFilePath,
      outputPath
    )
  )
  await Promise.all(writers)

  // export ALL audio
  scene.boards.forEach((board, index) => {
    if (board.audio && board.audio.filename && board.audio.filename.length) {
      // NOTE
      // copySync is only in fs-extra
      // we can use copyFileSync once we reach node v8.5.x
      fs.copySync(
        path.join(path.dirname(sceneFilePath), 'images', board.audio.filename),
        path.join(outputPath, board.audio.filename)
      )
    }
  })

  const STREAM_OFFSET = 2 // video + watermark

  let audioFilterComplex
  let audioFileArgs = []
  let audioFilters = []
  let audioStreamIndex = 0
  for (let board of scene.boards) {
    if (board.audio) {
      audioFileArgs = audioFileArgs.concat([
        '-i', path.join(path.dirname(sceneFilePath), 'images', board.audio.filename)
      ])

      let fadeout = `afade=t=out:duration=0.5`

      let filter = board.time > 0
        ? `${fadeout},adelay=${board.time}|${board.time}`
        : `${fadeout}`

      // stream index
      let n = audioStreamIndex + STREAM_OFFSET
      audioFilters.push(`[${n}]${filter}[s${n}]`)

      audioStreamIndex++
    }
  }

  if (audioFileArgs.length) {
    let mixout = ';'
    for (let i = 0; i < audioFilters.length; i++) {
      mixout += `[s${i + STREAM_OFFSET}]`
    }
    mixout += `amix=${audioFilters.length}[mix]`

    audioFilterComplex = audioFilters.join(';') + mixout
  }

  // generate the ffconcat image sequencer file
  // add last board twice because ffmpeg ¯\_(ツ)_/¯
  let boardsWithLastBoardTwice = scene.boards.concat(scene.boards[scene.boards.length - 1])
  let videoConcats = ['ffconcat version 1.0']
  let index = 0
  for (let board of boardsWithLastBoardTwice) {
    let durationInSeconds = boardModel.boardDuration(scene, board) / 1000
    videoConcats.push('')
    videoConcats.push(`file ${board.url}`)
    videoConcats.push(`duration ${durationInSeconds}`)
  }

  console.log('\n')
  console.log('writing video.ffconcat')
  console.log(videoConcats.join('\n'))
  fs.writeFileSync(path.join(outputPath, 'video.ffconcat'), videoConcats.join('\n'))
  console.log('\n')

  console.log('\n')
  const outputFilePath = path.join(outputPath, `${path.basename(sceneFilePath, path.extname(sceneFilePath))} Exported ${moment().format('YYYY-MM-DD hh.mm.ss')}.mp4`)
  console.log('writing to', outputFilePath)
  console.log('\n')

  let args = [
    // Input #0
    '-i', path.join(outputPath, 'video.ffconcat'),

    // Input #1
    '-i', electronUtil.fixPathForAsarUnpack('src/img/watermark.png'),
  ]

  args = args.concat(audioFileArgs)

  args = args.concat([
    '-filter_complex',
                        // via https://stackoverflow.com/a/20848224
                        // fixes "width not divisible by 2"
                        '[0]scale=-2:900[frame];' + 

                        // pass overlay through untouched
                        '[1]null[watermark];' +

                        // overlay watermark w/ shorthand positioning
                        '[frame][watermark]overlay=W-w:H-h[vid]' +

                        // use audio (if present) or route silence to mix
                        (audioFilterComplex
                          ? ';' + audioFilterComplex
                          : ''),

    '-map', '[vid]:v'
  ])

  args = args.concat([
    '-r', scene.fps,
    '-vcodec', 'libx264',
    '-acodec', 'aac', // 'libvo_aacenc',

    // via https://medium.com/@forasoft/the-grip-of-ffmpeg-4b05d7f7678c
    // '-b:v', '700k',

    // via https://trac.ffmpeg.org/wiki/Encode/H.264
    // QuickTime only supports YUV planar color space with 4:2:0 chroma subsampling (use -vf format=yuv420p or -pix_fmt yuv420p) for H.264 video.
    '-pix_fmt', 'yuv420p',

    // '-b:a', '128k',
    // '-ar', '44100',
    
    // TODO are these necessary?
    // via https://trac.ffmpeg.org/wiki/Encode/H.264
    '-tune', 'stillimage',
    '-preset', 'veryslow'
  ])

  if (audioFileArgs.length) {
    args = args.concat([
      '-map', '[mix]:a'
    ])
  }

  args = args.concat([
    // via https://uart.cz/1570/simple-animation-with-ffmpeg/
    // The -movflags +faststart parameters will move some media informations to
    // the beginning of file, which allows browser to start video even before it
    // was completely downloaded from the server.
    '-movflags', '+faststart',

    // overwrite existing
    '-n',

    '-stats',

    outputFilePath, // TODO quoting? filename?
  ])

  console.log('calling ffmpeg with args', args)
  console.log('\n')

  // debugging directory listing
  // console.log('\n')
  // console.log(`tree ${outputPath}:`)
  // let result = await execa('tree', [ outputPath ])
  // console.log(result.stdout)
  // console.log('\n')

  // opts.progressCallback(0)
  await convert(opts.outputPath, opts, args)
  console.log('done!')
  return outputFilePath
}

module.exports = {
  checkVersion,
  convertToVideo
}
