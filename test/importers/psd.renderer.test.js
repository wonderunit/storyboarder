// npx electron-mocha --renderer test/importers/psd.renderer.test.js
// find test/importers/psd.renderer.test.js | entr -c electron-mocha --renderer test/importers/psd.renderer.test.js

const path = require('path')
const fs = require('fs-extra')
const os = require('os')

const importerPsd = require('../../src/js/importers/psd')

const fixturesPath = path.join(__dirname, '..', 'fixtures')
const psdPath = path.join(fixturesPath, 'psd', 'images', 'board-1-XCAKU.psd')

describe('importers/psd', () => {
  it('can load a PSD file and read the flattened canvas', () => {
    let canvas = importerPsd.fromPsdBufferComposite(
      fs.readFileSync(psdPath)
    )

    //
    //
    // uncomment to write test files to tmp for manual review:
    //

    // let folderpath = path.join(os.tmpdir(), 'sg-psd-test')
    // fs.mkdirpSync(folderpath)
    // 
    // let img = canvas.toDataURL()
    // let data = img.replace(/^data:image\/\w+;base64,/, '')
    // let buf = Buffer.from(data, 'base64')
    // 
    // let key = 'reference'
    // let id = Math.floor(Math.random()*65536).toString(32)
    // let filename = `${key}.${id}.png`
    // let filepath = path.join(folderpath, filename)
    // fs.writeFile(filepath, buf)
    // 
    // console.log('open', filepath)
  })

  it('can load a PSD file with layers', () => {
    let canvases = importerPsd.fromPsdBuffer(
      fs.readFileSync(psdPath)
    )

    let folderpath = path.join(os.tmpdir(), 'sg-psd-test')
    fs.mkdirpSync(folderpath)

    //
    //
    // uncomment to write test files to tmp for manual review:
    //

    // for (let key in canvases) {
    //   let img = canvases[key].toDataURL()
    //   let data = img.replace(/^data:image\/\w+;base64,/, '')
    //   let buf = Buffer.from(data, 'base64')
    // 
    //   let id = Math.floor(Math.random()*65536).toString(32)
    //   let filename = `${key}.${id}.png`
    //   let filepath = path.join(folderpath, filename)
    //   fs.writeFile(filepath, buf)
    // 
    //   console.log('open', filepath)
    // }
  })
})
