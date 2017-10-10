//
// USAGE:
//
// find src/js/exporters/copy-project.js test/exporters/copy-project.test.js | entr -c electron-mocha --renderer test/exporters/copy-project.test.js
//

'use strict';
const tmp = require('tmp')
const fs = require('fs')
const path = require('path')
const assert = require('assert')
const mockFs = require('mock-fs')

const { shell } = require('electron')

const exporterCopyProject = require('../../src/js/exporters/copy-project')

let fixturesPath = path.join(__dirname, '..', 'fixtures')


// TODO
describe('exporters/copyProject', () => {
  // it('can copy a single-scene project', () => {
  //   let srcFilePath = path.resolve(path.join(fixturesPath, 'ducks', 'ducks.storyboarder'))
  //   let dstFolderPath = path.resolve(path.join(fixturesPath, 'ducks02'))
  //   exporterCopyProject.copyProject(srcFilePath, dstFolderPath)
  // })
  it('can copy a multi-scene project', () => {
    let srcFilePath = path.resolve(path.join(fixturesPath, 'projects', 'multi-scene', 'multi-scene.fountain'))
    let dstFolderPath = path.resolve(path.join(fixturesPath, 'projects', 'multi-scene02'))
    exporterCopyProject.copyProject(srcFilePath, dstFolderPath)
  })
  // TODO test failure handling
})
