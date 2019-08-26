const fs = require('fs-extra')
const path = require('path')
const pkg = require('../package.json')
const { exec } = require('child_process')
const { reducer, getSerializedState } = require('../src/js/shared/reducers/shot-generator')

const srcPath = path.join(__dirname, '..')

const exportName = `vr-demo-${pkg.version}-${new Date().toISOString()}`
const dstPath = path.join(__dirname, '..', 'dist', exportName)

console.log(`Generating ${exportName} …`)

fs.mkdirpSync(dstPath)

// source files
fs.copySync(
  path.join(srcPath, 'src', 'js', 'xr', 'dist'),
  dstPath
)

// data
fs.mkdirpSync(path.join(dstPath, 'data'))
fs.copySync(
  path.join(srcPath, 'src', 'js', 'xr', 'public', 'snd'),
  path.join(dstPath, 'data', 'snd')
)
fs.copySync(
  path.join(srcPath, 'src', 'data', 'shot-generator'),
  path.join(dstPath, 'data', 'system')
)

// state.json
const scene = JSON.parse(
  fs.readFileSync(
    path.join(srcPath, 'test', 'fixtures', 'shot-generator', 'shot-generator.storyboarder'),
    'utf-8'
  )
)
const board = scene.boards[0]
const state = reducer({}, { type: 'LOAD_SCENE', payload: board.sg.data })
const data = {
  ...getSerializedState(state),
  aspectRatio: scene.aspectRatio
}
fs.writeFileSync(
  path.join(dstPath, 'state.json'),
  JSON.stringify(data, null, 2)
)

console.log('Done!')
console.log('Test with:')
console.log('cd dist/' + exportName)
console.log('python -m SimpleHTTPServer')

exec('open ' + dstPath)
