// USAGE
// mocha test/app/index.test.js

const Application = require('spectron').Application
const assert = require('assert')
const os = require('os')

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

describe('application launch', function () {
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
})
