/* global describe it  */
// electron-mocha --renderer test/exporters/web.renderer.test.js
// find src/js/exporters/web.js test/exporters/web.renderer.test.js | entr -c electron-mocha --renderer test/exporters/web.renderer.test.js

// const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp')

window.TONE_SILENCE_VERSION_LOGGING = true
const exporterWeb = require('../../src/js/exporters/web')

describe('exporters/web', () => {
  it('can export web-friendly files for a scene', async () => {
    let sceneFilePath = path.join(__dirname, '..', 'fixtures', 'audio', 'audio.storyboarder')

    // load scene data
    // let scene = JSON.parse(fs.readFileSync(sceneFilePath))

    let tmpFolder = tmp.dirSync({ unsafeCleanup: false })
    let outputPath = path.join(tmpFolder.name, 'output')
    fs.mkdirSync(outputPath)

    await exporterWeb.exportForWeb(
      sceneFilePath,
      outputPath
    )

    console.log('\n\n\n')
    console.log('Test files written to:')
    console.log(outputPath)
    console.log('\n\n\n')
  })
})
