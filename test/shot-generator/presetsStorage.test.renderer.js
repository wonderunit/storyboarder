// npx electron-mocha --renderer test/shot-generator/presetsStorage.test.renderer.js

const assert = require('assert')
const mockFs = require('mock-fs')

const { app } = require('@electron/remote')
const fs = require('fs')
const path = require('path')

const presetsStorage = require('../../src/js/shared/store/presetsStorage')

const presetsPath = path.join(app.getPath('userData'), 'presets')

const posesFromFileSync = () => JSON.parse(
  fs.readFileSync(path.join(presetsPath, 'poses.json'), 'utf-8')
)

const posesWithoutPriority = {
  'without-priority': {
    id: 'without-priority'
  }
}

describe('poses', () => {
  beforeEach(() => {
    mockFs({
      [presetsPath]: {
        'poses.json': JSON.stringify(posesWithoutPriority)
      }
    })
  })

  it('migrates on load to ensure priority value exists', () => {
    assert(posesFromFileSync()['without-priority'].priority == null)
    let presets = presetsStorage.loadPosePresets()
    assert(presets.poses['without-priority'].priority === 0)
  })

  it('migrates on save to ensure priority value exists', () => {
    assert(posesFromFileSync()['without-priority'].priority == null)

    presetsStorage.savePosePresets({ poses: posesWithoutPriority })

    assert(posesFromFileSync()['without-priority'].priority === 0)
  })

  afterEach(function () {
    mockFs.restore()
  })
})
