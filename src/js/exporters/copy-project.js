const fs = require('fs')
const path = require('path')
const R = require('ramda')

const boardModel = require('../models/board')
const util = require('../utils')

const withFromToPaths = (filename, src, dst) => ({
  from: path.join(src, filename),
  to: path.join(dst, filename)
})

const getImageFilesUsedByBoard = board => ([
  ...boardModel.boardOrderedLayerFilenames(board).filenames,  // all PNG files
  boardModel.boardFilenameForThumbnail(board),                // thumbnail
  ...(board.link ? [board.link] : [])                         // any linked PSD
])

const getRelativeImagePathsUsedByScene = scene =>
  R.flatten(scene.boards.map(getImageFilesUsedByBoard))

const getAllAbsoluteFilePathsUsedByScene = srcFilePath => {
  let srcFolderPath = path.dirname(srcFilePath)
  // read the scene
  let scene = JSON.parse(fs.readFileSync(srcFilePath))
  // find all the files used in the scene
  let usedFiles = getRelativeImagePathsUsedByScene(scene)
  return [
    srcFilePath,
    ...usedFiles.map(f => path.join(srcFolderPath, 'images', f))
  ]
}

// srcFilePath: absolute path to project file (.storyboarder or .fountain)
const getFilesUsedByProject = srcFilePath => {
  // for convenience
  let srcFolderPath = path.dirname(srcFilePath)

  // is this a multi-scene project?
  const isMultiScene = (path.extname(srcFilePath) === '.fountain')

  // TODO test that `storyboards/` and `storyboard.settings` exist

  if (isMultiScene) {
    let files = []

    // .fountain file
    files.push(srcFilePath)

    // copy the storyboard.settings file
    files.push(path.join(srcFolderPath, 'storyboards', 'storyboard.settings'))

    // for each of the scenes in `storyboards/`, add their files as well
    let scenesDirsPath = path.join(srcFolderPath, 'storyboards')
    let sceneDirs = fs.readdirSync(scenesDirsPath).filter(file => fs.statSync(path.join(scenesDirsPath, file)).isDirectory())

    for (let dir of sceneDirs) {
      // find the first .storyboarder file in the directory
      let parentPath  = path.join(srcFolderPath, 'storyboards', dir)
      let storyboarderFilename = fs.readdirSync(parentPath).find(file => path.extname(file) === '.storyboarder')

      if (storyboarderFilename) {
        files.push(...getAllAbsoluteFilePathsUsedByScene(path.join(parentPath, storyboarderFilename)))
      } else {
        // can't find a .storyboarder file
        console.warn(`Missing expected .storyboarder file in ${parentPath}`)
      }
    }

    return files
  } else {
    return getAllAbsoluteFilePathsUsedByScene(srcFilePath)
  }
}

// copy the project files
// single-scene or multi-scene
// for multi-scene, this includes .fountain and .settings and scene folders
//
// for each scene ...
// ... grab all the files in the scene
// ... for multi-scene, grab the script and .settings
//
const copyProject = (srcFilePath, dstFolderPath) => {
  let srcFolderPath = path.dirname(srcFilePath)

  console.log('Copying project', srcFilePath, 'to folder', dstFolderPath)

  let files = getFilesUsedByProject(srcFilePath)

  let pairs = files.map(from => {
    return {
      from: from,
      to: from.replace(srcFolderPath, dstFolderPath)
    }
  })

  // trace for debugging
  const relpath = str => str.replace(path.join(process.cwd(), 'test', 'fixtures'), '')
  console.log(
    pairs.map(({ from, to }) => {
      return {
        from: relpath(from),
        to: relpath(to)
      }
    })
  )

  // TODO

  // copy all files
  // ... warn if missing
  // ... warn if failed
}

module.exports = {
  copyProject
}
