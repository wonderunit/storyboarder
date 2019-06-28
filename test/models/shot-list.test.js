/* global describe it */

// npx mocha -R min --watch test/models/shot-list.test.js

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const {
  getCameraSetups,
  getShotListForScene
} = require('../../src/js/models/shot-list')

describe('shot-list', () => {
  const fixturesPath = path.join(__dirname, '..', 'fixtures')
  const scene = JSON.parse(
    fs.readFileSync(
      path.join(fixturesPath, 'shot-generator', 'shot-generator.storyboarder')
    )
  )

  it('can list camera setups', () => {
    const setups = getCameraSetups(scene)

    // for (let setup of setups) {
    //   console.log(setup.camera.name || setup.camera.displayName)
    //   for (let shot of setup.shots) {
    //     console.log('\t', shot)
    //   }
    // }

    assert.equal(Object.values(setups).length, 1)
  })

  it('can export a shot list for a single scene', () => {
    const shotListData = getShotListForScene(scene)

    assert.equal(shotListData.setups.length, 1)

    // console.log(
    //   JSON.stringify(
    //     shotListData,
    //     null,
    //     2
    //   )
    // )
  })
})
