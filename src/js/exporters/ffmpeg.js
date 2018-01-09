const electronUtil = require('electron-util')
const execa = require('execa')
const ffmpeg = require('@ffmpeg-installer/ffmpeg')

const ffmpegPath = electronUtil.fixPathForAsarUnpack(ffmpeg.path)

console.log('initialized exporters/ffmpeg')
console.log('  binary:', ffmpeg.path)
console.log('  version:', ffmpeg.version)

// via https://github.com/wulkano/kap/blob/5769d7658778bfb9ad31fd527326f8407082f910/app/src/scripts/convert.js
//
// const convert = async (outputPath, opts, args) => {
//   return new Promise((resolve, reject) => {
//     const converter = execa(ffmpegPath, args)
//     let amountOfFrames
// 
//     converter.stderr.on('data', data => {
//       data = data.toString().trim()
//       const matchesDuration = durationRegex.exec(data)
//       const matchesFrame = frameRegex.exec(data)
// 
//       if (matchesDuration) {
//         amountOfFrames = Math.ceil(moment.duration(matchesDuration[1]).asSeconds() * 30)
//       } else if (matchesFrame) {
//         const currentFrame = matchesFrame[1]
//         opts.progressCallback(currentFrame / amountOfFrames)
//       }
//     })
//     converter.on('error', reject)
//     converter.on('exit', code => {
//       if (code === 0) {
//         resolve(outputPath)
//       } else {
//         reject(code)
//       }
//     })
//     converter.catch(reject)
//   })
// }

const checkVersion = async () => {
  // console.log('ffmpeg#ensureVersion')

  return new Promise((resolve, reject) => {
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
    process.stderr.on('data', data => {
      data = data.toString().trim()
      // console.log(data)
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
}

// const convertToVideo = async (outputPath, scene) => {
//   // console.log('ffmpeg#convertToVideo writing to', outputPath, 'with scene data', scene)
// 
//   return new Promise((resolve, reject) => {
//     let matchedVersion
// 
//     const process = execa(ffmpegPath, [
//       '-version'
//     ])
//     process.stdout.on('data', data => {
//       data = data.toString().trim()
//       const matchesVersion = data.match(/^ffmpeg version (\S+)/)
//       if (matchesVersion) {
//         matchedVersion = matchesVersion[1]
//       }
//     })
//     process.stderr.on('data', data => {
//       data = data.toString().trim()
//       // console.log(data)
//     })
//     process.on('error', reject)
//     process.on('exit', code => {
//       if (code === 0) {
//         resolve(matchedVersion)
//       } else {
//         reject(new Error(`Could not use ffmpeg. Failed with error ${code}`))
//       }
//     })
//     process.catch(reject)
//   })
// }

module.exports = {
  checkVersion,
  // convertToVideo
}
