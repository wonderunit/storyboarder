// npx electron-mocha --renderer test/exporters/psd.renderer.test.js

const path = require('path')
const assert = require('assert')

const exporterPsd = require('../../src/js/exporters/psd')

describe('exporters/psd', function () {
  const fixturesPath = path.join(__dirname, '..', 'fixtures')

  // exporters/psd#imagesMetaToPSDBuffer
  it('can generate a psd buffer', async function () {
    let imagesMeta = [
      {
        name: 'reference',
        filepath: path.join(fixturesPath, 'example', 'images', 'board-1-UDRF3-reference.png')
      },
      {
        name: 'notes',
        filepath: path.join(fixturesPath, 'example', 'images', 'board-1-UDRF3-notes.png')
      }
    ]

    let buffer = await exporterPsd.imagesMetaToPSDBuffer(imagesMeta)
    assert(buffer.length === 198554)
  })
})
