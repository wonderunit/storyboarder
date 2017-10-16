// USAGE
// NODE_ENV=test mocha test/app/index.test.js

const Application = require('spectron').Application
const assert = require('assert')
const os = require('os')
const { ipcRenderer } = require('electron')

const getAppArgs = () => {
  // uncomment this to test dev mode app
  //
  // return {
  //   path: './node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
  //   args: ['./src/js/main.js']
  // }

  switch (os.platform()) {
    case 'darwin':
      return {
        path: './dist/mac/Storyboarder.app/Contents/MacOS/Storyboarder'
      }
      break
    default:
      throw new Error('Cannot test on this platform yet.')
  }
}

describe('application', function () {
  this.timeout(10000)

  beforeEach(function () {
    this.app = new Application({
      env: { RUNNING_IN_SPECTRON: '1' },
      ...getAppArgs()
    })
    return this.app.start()
  })

  afterEach(function () {
    if (this.app && this.app.isRunning()) {
      return this.app.stop()
    }
  })

  it('shows welcomeWindow and newWindow', async function () {
    let count = await this.app.client.getWindowCount()
    assert.equal(count, 2) // welcomeWindow and newWindow
  })

  it('can open a new project', async function () {
    // await new Promise(resolve => setTimeout(resolve, 10000))

    await this.app.client.waitUntilWindowLoaded()

    this.app.electron.ipcRenderer.send(
      'openFile',
      './test/fixtures/projects/multi-scene/multi-scene.fountain'
    )

    await new Promise(async resolve => {
      let interval = setInterval(async () => {
        let count = await this.app.client.getWindowCount()
        // ensure that the workspace window has loaded
        if (count === 4) {
          clearInterval(interval)
          resolve()
        }
      }, 500)
    })

    await this.app.client.windowByIndex(3) // focus the workspace window

    // ensure the UI has loaded
    await this.app.client.waitUntilTextExists(
      '.stats-primary',
      'Scene-1-EXT-A-P…ACE-DAY-1-ZX3ZM.storyboarder'
    )
  })
})
