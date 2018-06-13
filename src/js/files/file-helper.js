const path = require('path')
const fs = require('fs')

const importerPsd = require('../importers/psd')

/**
 * Retrieve an object with base 64 representations of an image file ready for storyboard pane layers.
 *  
 * @param {string} filepath 
 * @param {Object} options
 * @returns {Object} An object with data for notes (optional), reference (optional), and main
 */
let getBase64ImageDataFromFilePath = (filepath, options={ importTargetLayer: 'reference' }) => {
  let { importTargetLayer } = options
  let type = path.extname(filepath).toLowerCase()

  let result = {}
  switch (type) {
    case '.png':
      result[importTargetLayer] = getBase64TypeFromFilePath('png', filepath)
      break
    case '.jpg':
    case '.jpeg':
      result[importTargetLayer] = getBase64TypeFromFilePath('jpg', filepath)
      break
    case '.psd':
      try {
        result = getBase64TypeFromPhotoshopFilePath(filepath, options)
      } catch (err) {
        console.error(err)
        return null
      }
      break
  }
  return result
}

let getBase64TypeFromFilePath = (type, filepath) => {
  if (!fs.existsSync(filepath)) return null

  // via https://gist.github.com/mklabs/1260228/71d62802f82e5ac0bd97fcbd54b1214f501f7e77
  let data = fs.readFileSync(filepath).toString('base64')
  return `data:image/${type};base64,${data}`
}

const getBase64TypeFromPhotoshopFilePath = filepath => {
  if (!fs.existsSync(filepath)) return null

  let canvases = importerPsd.fromPsdBuffer(
    fs.readFileSync(
      filepath
    )
  )

  // convert in-place
  for (key in canvases) {
    canvases[key] = canvases[key].toDataURL()
  }

  // e.g.: { fill: 'data:image/png,...' }
  return canvases
}

module.exports = {
  getBase64ImageDataFromFilePath,
  getBase64TypeFromFilePath  
}
