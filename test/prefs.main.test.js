const assert = require('assert')
const { app } = require('electron')
const fs = require('fs')
const mockFs = require('mock-fs')
const path = require('path')

const pkg = require('../package.json')
const prefsModule = require('../src/js/prefs')

const adjustMajorVer = (str, value = +1) => {
  let parts = str.split('.')
  return [Number(parts[0]) + value, ...parts.slice(1)].join('.')
}

describe('prefs', () => {
  const pathToPrefsFile = path.join(app.getPath('userData'), 'pref.json')

  it('has some default preferences', () => {
    const initialState = {
      version: adjustMajorVer(pkg.version, -1),
      enableAspirationalMessages: false
    }

    mockFs({
      [path.dirname(pathToPrefsFile)]: {
        'pref.json': JSON.stringify(initialState)
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

  // if the version of Storyboarder currently running
  // is OLDER (LESS THAN) the version in preferences
  // do NOT migrate preferences
  it('should not decrement preferences version if Storyboarder is old', () => {
    const initialState = {
      version: adjustMajorVer(pkg.version, +1)
    }
    mockFs({
      [path.dirname(pathToPrefsFile)]: {
        'pref.json': JSON.stringify(initialState)
      }
    })

    prefsModule.init(pathToPrefsFile)

    // should NOT migrate version
    assert.equal(prefsModule.getPrefs().version, initialState.version)
  })

  after(function () {
    mockFs.restore()
  })
})
