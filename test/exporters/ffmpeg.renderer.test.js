// electron-mocha --renderer test/exporters/ffmpeg.renderer.test.js
// find src/js/exporters/ffmpeg.js test/exporters/ffmpeg.renderer.test.js | entr -c electron-mocha --renderer test/exporters/ffmpeg.renderer.test.js

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const tmp = require('tmp')

window.TONE_SILENCE_VERSION_LOGGING = true
const exporterFfmpeg = require('../../src/js/exporters/ffmpeg')

describe('exporters/ffmpeg', () => {
  it('can invoke ffmpeg', async () => {
    let version = await exporterFfmpeg.checkVersion()
    assert.equal(version, 'N-87313-g73bf0f4-tessus')
  })
  // it('can generate an MP4 video for a scene', async () => {
  //   let tmpFolder = tmp.dirSync({ unsafeCleanup: true })
  // 
  //   let outputPath = tmp.tmpNameSync()
  // 
  //   let scene = {
  //     boards: []
  //   }
  // 
  //   await exporterFfmpeg.convertToVideo(outputPath, scene)
  // 
  //   tmpFolder.removeCallback()
  // })
})
