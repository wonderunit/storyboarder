const fs = require('fs')
const path = require('path')

let defaultWatermarkImagePath = path.join(__dirname, '..', '..', 'img', 'watermark.png')

const customWatermarkExists = (prefs, userDataPath) => {
  if (!prefs.userWatermark) return false
  let expectedPath = path.join(userDataPath, 'watermark.png')
  return fs.existsSync(expectedPath)
}

// usage: watermarkImagePath(prefs.userWatermark, remote.app.getPath('userData'))
const watermarkImagePath = (prefs, userDataPath) => {
  let expectedPath = path.join(userDataPath, 'watermark.png')

  return customWatermarkExists(prefs, userDataPath)
    ? expectedPath
    : defaultWatermarkImagePath
}

module.exports = {
  customWatermarkExists,
  watermarkImagePath
}
