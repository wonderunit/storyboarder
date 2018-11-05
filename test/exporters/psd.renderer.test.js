// npx electron-mocha --renderer test/exporters/psd.renderer.test.js

const path = require('path')
const assert = require('assert')

const exporterPsd = require('../../src/js/exporters/psd')
const exporterCommon = require('../../src/js/exporters/common')

describe('exporters/psd', function () {
  const fixturesPath = path.join(__dirname, '..', 'fixtures')
  const imagesPath = path.join(fixturesPath, 'example', 'images')

  let asCanvas = async filepath => {
    let image = await exporterCommon.getImage(filepath)

    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d')

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    context.drawImage(image, 0, 0)

    return canvas
  }

  // exporters/psd#toPsdBuffer
  it('can generate a psd buffer', async function () {
    let imagesMeta = [
      {
        name: 'reference',
        canvas: await asCanvas(
          path.join(imagesPath, 'board-1-UDRF3-reference.png')
        )
      },
      {
        name: 'notes',
        canvas: await asCanvas(
          path.join(imagesPath, 'board-1-UDRF3-notes.png')
        )
      }
    ]

    let buffer = await exporterPsd.toPsdBuffer(imagesMeta)
    assert(buffer.length > 190000)
  })
})
