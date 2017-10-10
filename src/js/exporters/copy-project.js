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

const getFilesUsedByScene = scene =>
  R.flatten(scene.boards.map(getImageFilesUsedByBoard))

// copy the project files
// single-scene or multi-scene
// for multi-scene, this includes .fountain and .settings and scene folders
//
// for each scene ...
// ... grab all the files in the scene
// ... for multi-scene, grab the script and .settings
//
const copyProject = (srcFilePath, dstFolderPath) => {
  console.log('Copying project', srcFilePath, 'to folder', dstFolderPath)

  // for convenience
  let srcFolderPath = path.dirname(srcFilePath)
  let dstFilePath = path.join(dstFolderPath, path.basename(srcFilePath))

  // is this a multi-scene project?
  const isMultiScene = (path.extname(srcFilePath) === '.fountain')
  // TODO test that `storyboards/` and `storyboard.settings` exist

  let pairs = []

  if (isMultiScene) {
    // copy the .fountain file
    pairs.push({ from: srcFilePath, to: dstFilePath })

    // copy the storyboard.settings file
    pairs.push({
      from: path.join(srcFolderPath, 'storyboards', 'storyboard.settings'),
      to: path.join(dstFolderPath, 'storyboards', 'storyboard.settings'),
    })

    // for each of the scenes in `storyboards/`, copy their files as well
    let scenesDirsPath = path.join(srcFolderPath, 'storyboards')
    let sceneDirs = fs.readdirSync(scenesDirsPath).filter(file => fs.statSync(path.join(scenesDirsPath, file)).isDirectory())

    for (let dir of sceneDirs) {
      // find the first .storyboarder file in the directory
      let parentPath  = path.join(srcFolderPath, 'storyboards', dir)
      let storyboarderFilename = fs.readdirSync(parentPath).find(file => path.extname(file) === '.storyboarder')
      if (storyboarderFilename) {
        // read the scene
        let scene = JSON.parse(fs.readFileSync(path.join(parentPath, storyboarderFilename)))
        // find all the files used in the scene
        let usedFiles = getFilesUsedByScene(scene)
        // add them to the list
        pairs = [
          ...pairs,
          // TODO key by directory name
          withFromToPaths(storyboarderFilename, parentPath, path.join(dstFolderPath, 'storyboards', dir)),
          ...usedFiles.map(filename => withFromToPaths(filename, srcFolderPath, dstFolderPath))
        ]
      } else {
        // TODO can't find a .storyboarder file
      }
    }
  } else {
    let scene = JSON.parse(fs.readFileSync(srcFilePath))
    // find all the files used in the scene
    let usedFiles = getFilesUsedByScene(scene)
    // add them to the list
    pairs = [
      ...pairs,
      // TODO key by directory name
      ...usedFiles.map(filename => withFromToPaths(filename, srcFolderPath, dstFolderPath))
    ]
  }

  const relpath = str => str.replace(path.join(process.cwd(), 'test', 'fixtures', 'projects/'), '')
  console.log(
    pairs.map(({ from, to }) => {
      return {
        from: relpath(from),
        to: relpath(to)
      }
    })
  )

  // copy all files
  // ... warn if missing
  // ... warn if failed

}

module.exports = {
  copyProject
}
