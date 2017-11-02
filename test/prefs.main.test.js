const assert = require('assert')
const { app } = require('electron')
const fs = require('fs')
const mockFs = require('mock-fs')
const path = require('path')

const pkg = require('../package.json')
const prefsModule = require('../src/js/prefs')

describe('prefs', () => {
  const pathToPrefsFile = path.join(app.getPath('userData'), 'pref.json')

  it('has some default preferences', () => {
    mockFs({
      [path.dirname(pathToPrefsFile)]: {
        'pref.json': JSON.stringify({
          version: '65536.0.0',
          enableAspirationalMessages: false
        })
      }
    })

    prefsModule.init(pathToPrefsFile)

    // should migrate version
    assert.equal(prefsModule.getPrefs().version, pkg.version)

    // should respect users choice for `enableAspirationalMessages`
    assert.equal(prefsModule.getPrefs().enableAspirationalMessages, false)

    // should write missing `lastUsedFps`
    assert.equal(prefsModule.getPrefs().lastUsedFps, 24)
  })

  // if the version of Storyboarder running is OLDER than the one that wrote preferences
  // do not migrate preferences
  it('should not migrate if version is less than preferences version')

  after(function () {
    mockFs.restore()
  })
})
