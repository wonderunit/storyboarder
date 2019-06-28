/* global describe it */

// npx mocha -R min --watch test/models/shot-list.test.js

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const {
  getCameraSetups,
  getShotListForScene,
  getShotListForProject
} = require('../../src/js/models/shot-list')

describe('shot-list', () => {
  const fixturesPath = path.join(__dirname, '..', 'fixtures')
  const scene = JSON.parse(
    fs.readFileSync(
      path.join(fixturesPath, 'shot-generator', 'shot-generator.storyboarder')
    )
  )
  const scriptFilePath = path.join(fixturesPath, 'projects', 'multi-scene', 'multi-scene.fountain')

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
    const shotListDataForScene = getShotListForScene(scene)

    assert.equal(shotListDataForScene.setups.length, 1)

    // console.log(
    //   JSON.stringify(
    //     shotListDataForScene,
    //     null,
    //     2
    //   )
    // )
  })

  it('can export shot list for a multi-scene project', () => {
    const shotListData = getShotListForProject(scriptFilePath)

    console.log(
      JSON.stringify(
        shotListData,
        null,
        2
      )
    )
  })
})
