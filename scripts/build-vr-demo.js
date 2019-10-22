const fs = require('fs-extra')
const path = require('path')
const pkg = require('../package.json')
const { exec } = require('child_process')
const { reducer, initialState, getSerializedState } = require('../src/js/shared/reducers/shot-generator')

const srcPath = path.join(__dirname, '..')

const exportName = `vr-demo-${pkg.version}-${new Date().toISOString()}`
const dstPath = path.join(__dirname, '..', 'dist', exportName)

// e.g.: node scripts/build-vr-demo.js test/fixtures/shot-generator/shot-generator.storyboarder
const defaultStoryboarderFilePath = path.join(srcPath, 'test', 'fixtures', 'shot-generator', 'shot-generator.storyboarder')
let storyboarderFilePath = process.argv[2] && process.argv[2].includes('.storyboarder')
  ? process.argv[2]
  : defaultStoryboarderFilePath

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
  path.join(srcPath, 'src', 'data', 'shot-generator'),
  path.join(dstPath, 'data', 'system')
)

// pose images
const os = require('os')
fs.mkdirpSync(path.join(dstPath, 'data', 'presets'))
let poseImagesFolderPath = `${os.homedir()}/Library/Application Support/Storyboarder/presets/poses`
if (!fs.existsSync(poseImagesFolderPath)) {
  console.error('Could not find pose images folder at', poseImagesFolderPath)
  return
}
fs.copySync(
  path.join(poseImagesFolderPath),
  path.join(dstPath, 'data', 'presets', 'poses')
)

// state.json
console.log(`Reading ${storyboarderFilePath} …`)
const scene = JSON.parse(
  fs.readFileSync(
    storyboarderFilePath,
    'utf-8'
  )
)
const board = scene.boards[0]
const state = reducer({}, { type: 'LOAD_SCENE', payload: board.sg.data })
const data = {
  ...getSerializedState(state),
  aspectRatio: scene.aspectRatio,
  models: initialState.models,
  presets: initialState.presets
}
fs.writeFileSync(
  path.join(dstPath, 'state.json'),
  JSON.stringify(data, null, 2)
)

// user data (e.g. custom model files)
if (storyboarderFilePath != defaultStoryboarderFilePath) {
  let folder = path.dirname(storyboarderFilePath)
  if (fs.existsSync(path.join(folder, 'models'))) {
    console.log(`Copying models folder from ${folder} …`)
    fs.mkdirpSync(path.join(dstPath, 'data', 'user'))
    fs.copySync(
      path.join(folder, 'models'),
      path.join(dstPath, 'data', 'user')
    )
  }
}

console.log('Done!')
console.log('Test with:')
console.log('cd dist/' + exportName)
console.log('python -m SimpleHTTPServer')

exec('open ' + dstPath)
