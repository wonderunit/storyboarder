// npx mocha -R min --watch test/models/shot-list.test.js

/* global describe it */
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const { getCameraSetups } = require('../../src/js/models/shot-list')

describe('shot-list', () => {
  const fixturesPath = path.join(__dirname, '..', 'fixtures')
  const scene = JSON.parse(
    fs.readFileSync(
      path.join(fixturesPath, 'shot-generator', 'shot-generator.storyboarder')
    )
  )

  it('can list camera setups', () => {
    const setups = getCameraSetups(scene)

    // console.log('found', Object.values(setups).length, 'camera setups')
    // for (let setup of setups) {
    //   console.log(setup.camera.displayName)
    //   for (let board of setup.boards) {
    //     console.log('\t', board.shot)
    //   }
    // }

    assert.equal(Object.values(setups).length, 1)
  })
})
