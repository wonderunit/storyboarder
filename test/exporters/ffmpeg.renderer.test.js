// electron-mocha --renderer test/exporters/ffmpeg.renderer.test.js
// find src/js/exporters/ffmpeg.js test/exporters/ffmpeg.renderer.test.js | entr -c electron-mocha --renderer test/exporters/ffmpeg.renderer.test.js

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp')

window.TONE_SILENCE_VERSION_LOGGING = true
const exporterFfmpeg = require('../../src/js/exporters/ffmpeg')

let tmpFolder
describe('exporters/ffmpeg', () => {
  before(function () {
    tmpFolder = tmp.dirSync({ unsafeCleanup: true })
  })
  after(function () {
    tmpFolder.removeCallback()
  })

  it('can invoke ffmpeg', async () => {
    let version = await exporterFfmpeg.checkVersion()
    assert.equal(version, 'N-87313-g73bf0f4-tessus')
  })
  it('can generate an MP4 video for a scene', async () => {
    // uncomment to test a video with no audio track
    // let sceneFilePath = path.join(__dirname, '..', 'fixtures', 'example', 'example.storyboarder')

    // should generate video with audio track
    let sceneFilePath = path.join(__dirname, '..', 'fixtures', 'audio', 'audio.storyboarder')

    // load scene data
    let scene = JSON.parse(fs.readFileSync(sceneFilePath))
    // test default duration
    assert(typeof scene.boards[0].duration === 'undefined')

    let tmpFolder = tmp.dirSync({ unsafeCleanup: true })
    let outputPath = path.join(tmpFolder.name, 'output')
    fs.mkdirSync(outputPath)

    let result = await exporterFfmpeg.convertToVideo(
      {
        outputPath,
        sceneFilePath,
        scene,

        shouldWatermark: true,
        watermarkImagePath: path.join(__dirname, '..', '..', 'test', 'fixtures', 'images', 'watermarks', 'watermark_1600x900.png'),

        // FIXME
        progressCallback: progress => {}
      }
    )

    // for debugging
    //  uncomment to copy the example movie to test/results for inspection
    //
    // let saveResults = true
    // if (saveResults) {
    //   let src = result
    //   let dst = path.join(__dirname, '..', 'results', 'out.mp4')
    //   console.log('\n\n')
    //   console.log('copying', src, 'to', dst, 'for review')
    //   fs.copySync(src, dst)
    //   console.log('\n')
    //   console.log('open', path.dirname(dst))
    //   console.log('\n\n')
    // }

    assert(result.includes('audio'))
    assert(result.includes('Exported'))
    assert(result.includes('mp4'))

    tmpFolder.removeCallback()
  }).timeout(0)
})
