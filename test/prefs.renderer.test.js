const assert = require('assert')
const remote = require('@electron/remote')
const fs = require('fs-extra')
const mockFs = require('mock-fs')
const path = require('path')
const tmp = require('tmp')

const pkg = require('../package.json')
const prefsModule = remote.require(path.join(__dirname, '..', 'src', 'js', 'prefs'))


describe('prefs (renderer)', () => {
  describe('getPrefs/set', () => {
    let tmpdir
    before(() => {
      const initialState = {
        version: pkg.version,
        enableTooltips: false
      }

      tmpdir = tmp.dirSync()
      const pathToPrefsFile = path.join(tmpdir.name, 'pref.json')
      fs.writeFileSync(pathToPrefsFile, JSON.stringify(initialState))

      prefsModule.init(pathToPrefsFile)
    })
    it('can set and get values', () => {
      prefsModule.set('enableTooltips', false)
      assert.equal(prefsModule.getPrefs()['enableTooltips'], false)

      prefsModule.set('enableTooltips', true)
      assert.equal(prefsModule.getPrefs()['enableTooltips'], true)

      prefsModule.set('enableTooltips', false)
      assert.equal(prefsModule.getPrefs()['enableTooltips'], false)
    })
    after(() => {
      fs.emptyDirSync(tmpdir.name)
      tmpdir.removeCallback()
    })
  })
})
