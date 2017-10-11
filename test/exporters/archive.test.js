//
// USAGE:
//
// find src/js/exporters/archive.js test/exporters/archive.test.js | entr -c electron-mocha --renderer test/exporters/archive.test.js
//

const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp')

const exporterArchive = require('../../src/js/exporters/archive')

let fixturesPath = path.join(__dirname, '..', 'fixtures')
let fountainProjectPath = path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'multi-scene.fountain'))

describe('exporters/archive/exportAsZIP', () => {
  it('can export to ZIP', async () => {
      let tmpdir = tmp.dirSync()

      try {
        let exportFilePath = path.join(tmpdir.name, 'multi-scene-file.zip')

        await exporterArchive.exportAsZIP(fountainProjectPath, exportFilePath)

        assert(fs.existsSync(exportFilePath))

        let stat = fs.statSync(exportFilePath)
        assert(stat.size > 22, 'ZIP file size should be greater than 22 bytes')
      } finally {
        fs.emptyDirSync(tmpdir.name)
        tmpdir.removeCallback()
      }
  })
})
