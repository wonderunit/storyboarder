const fs = require('fs')
const path = require('path')

exports.default = async function beforeBuild (context) {
  console.log('  + scripts/electron-builder-before-build.js')

  let pathToNodeModules = path.join(__dirname, '..', 'node_modules')

  if (fs.existsSync(pathToNodeModules)) {
    console.log(`      • removing node_modules to force ffmpeg-static to re-install for correct architecture`)
    fs.rmSync(pathToNodeModules, { recursive: true })
  }

  return true
}
