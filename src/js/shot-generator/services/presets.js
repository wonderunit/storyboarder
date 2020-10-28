const { app } = require('electron').remote
const fs = require('fs-extra')
const path = require('path')
const R = require('ramda')

const exportPresetFilesToProject = (exportableUserPresets, dir, getUserPresetPath) => {
  console.log('exporting user presets to project')

  let asSrc = getUserPresetPath
  let srcAsDest = R.replace(app.getPath('userData'), dir)

  for (let presetType in exportableUserPresets) {
    for (let { filenames } of exportableUserPresets[presetType]) {
      for (let filename of filenames) {
        let src = asSrc(presetType, filename)
        let dest = srcAsDest(src)

        // copy each file unless ...
        // ... 1) it already exists ...
        if (fs.existsSync(dest)) {
          let srcStats = fs.statSync(src)
          let destStats = fs.statSync(dest)
          // ... and 2) the file sizes match ...
          if (srcStats.size == destStats.size) {
            // ... and 3) the last modified times match ...
            if (srcStats.mtime == destStats.mtime) {
              // (don't copy, skip ahead)
              console.log('files match, ignoring', src, 'to', dest)
              continue
            }
            // TODO could compare binary contents of the files
            // bytewise, hash, etc
            // see: https://www.npmjs.com/package/stream-equal
          }
        }
        console.log('cp', src, 'to', dest)
        fs.ensureDirSync(path.dirname(dest))
        fs.copySync(src, dest, { overwrite: true })
      }
    }
  }
}

module.exports = {
  exportPresetFilesToProject
}
