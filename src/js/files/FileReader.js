const path = require('path')
const fs = require('fs')

/**
 * Retrieve a base 64 representation of an image file
 *  
 * @param {string} filepath 
 * @returns {string}
 */
let getBase64ImageDataFromFilePath = (filepath) => {
  let arr = filepath.split(path.sep)
  let filename = arr[arr.length-1]
  let filenameParts =filename.toLowerCase().split('.')
  let type = filenameParts[filenameParts.length-1]

  switch(type) {
    case "png":
      return getBase64TypeFromFilePath('png', filepath)
    case "jpg":
      return getBase64TypeFromFilePath('jpg', filepath)
    case "tif":
    case "tiff":
      return getBase64TypeFromFilePath('tiff', filepath)
  }
}

let getBase64TypeFromFilePath = (type, filepath) => {
  if (!fs.existsSync(filepath)) return null

  // via https://gist.github.com/mklabs/1260228/71d62802f82e5ac0bd97fcbd54b1214f501f7e77
  let data = fs.readFileSync(filepath).toString('base64')
  return `data:image/${type};base64,${data}`
}

module.exports = {
  getBase64ImageDataFromFilePath,
}