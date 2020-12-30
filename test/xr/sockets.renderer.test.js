// npx electron-mocha -r @babel/register --watch --renderer test/xr/sockets.renderer.test.js

import assert from 'assert'

import {
  getPublicDirectories,
  resolvePublicPath
} from '../../src/js/services/server/sockets'

const staticPath = 'STATIC_PATH'
const projectPath = 'PROJECT_PATH'
const userDataPath = 'USER_DATA_PATH'

const publicDirectories = getPublicDirectories(staticPath, projectPath, userDataPath)

describe('resolvePublicPath', () => {
  it('allows serving files from permitted directories', () => {
    assert.strictEqual(
      resolvePublicPath(publicDirectories, '/data/system/xr/controller.glb'),
      'STATIC_PATH/data/shot-generator/xr/controller.glb'
    )
  })
  it('prevents serving files from any other directories', () => {
    assert.throws(
      () => resolvePublicPath(publicDirectories, '/data/sub-directory/file.glb')
    )
  })
  it('prevents directory traversal attacks', () => {
    assert.throws(
      () => resolvePublicPath(publicDirectories, '/data/system/xr/../../file.glb')
    )
  })
})
