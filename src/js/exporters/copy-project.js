const fs = require('fs-extra')
const path = require('path')
const R = require('ramda')

const boardModel = require('../models/board')
const util = require('../utils')

const getRelativeMediaPathsUsedByScene = (scene, options = { copyBoardUrlMainImages: false}) =>
  R.flatten(scene.boards.map(boardModel.getMediaFilenames))

const getAllAbsoluteFilePathsUsedByScene = (srcFilePath, options = { copyBoardUrlMainImages: false }) => {
  let srcFolderPath = path.dirname(srcFilePath)
  // read the scene
  let scene = JSON.parse(fs.readFileSync(srcFilePath))
  // find all the files used in the scene
  let usedFiles = getRelativeMediaPathsUsedByScene(scene)

  // for compatibility with old scenes prior to Storyboarder 1.6.x
  // can optionally copy board.url "main layer" images
  let boardUrlMainImages = []
  if (options.copyBoardUrlMainImages) {
    for (let board of scene.boards) {
      let filename = path.join(srcFolderPath, 'images', board.url)
      if (fs.existsSync(filename)) {
        boardUrlMainImages.push(filename)
      }
    }
  }

  return [
    // srcFilePath,
    ...usedFiles.map(f => path.join(srcFolderPath, 'images', f)),
    ...boardUrlMainImages
  ]
}

// srcFilePath: absolute path to project file (.storyboarder or .fountain/.fdx)
const getFilesUsedByProject = (srcFilePath, options = { copyBoardUrlMainImages: false }) => {
  // for convenience
  let srcFolderPath = path.dirname(srcFilePath)

  // is this a multi-scene project?
  const isMultiScene = (path.extname(srcFilePath) === '.fountain' || path.extname(srcFilePath) === '.fdx')

  if (isMultiScene) {
    let files = []

    // .fountain file
    // files.push(srcFilePath)

    if (
      !fs.existsSync(path.join(srcFolderPath, 'storyboards')) ||
      !fs.existsSync(path.join(srcFolderPath, 'storyboards', 'storyboard.settings'))
    ) {
      throw new Error('This script is not part of a Storyboarder project')
    }

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
        let storyboarderFilePath = path.join(parentPath, storyboarderFilename)
        files.push(storyboarderFilePath, ...getAllAbsoluteFilePathsUsedByScene(storyboarderFilePath, options))
      } else {
        // can't find a .storyboarder file
        console.warn(`Missing expected .storyboarder file in ${parentPath}`)
      }
    }

    return files
  } else {
    return getAllAbsoluteFilePathsUsedByScene(srcFilePath, options)
  }
}

// copy the project files
//
// single-scene or multi-scene
// (for multi-scene, this includes .fountain/.fdx and .settings and scene folders)
//
// for each scene ...
//   ... grab all the files in the scene
//   ... for multi-scene, grab the script and .settings
//
// srcFilePath:   absolute path to source project .storyboarder or .fountain/.fdx
//
// dstFolderPath: absolute path to destination folder
//                basename will be used to rename the destination project file
//
// options:
// copyBoardUrlMainImages: if true, copy `.url` main layer image filenames used in boards prior to 1.6. (default: false)
//
const copyProject = (
  srcFilePath,
  dstFolderPath,
  options = {
    copyBoardUrlMainImages: false,
    ignoreMissing: false
  }
) => {
  let srcFolderPath = path.dirname(srcFilePath)

  // console.log('Copying project', srcFilePath, 'to folder', dstFolderPath)

  let files = getFilesUsedByProject(srcFilePath, options)

  let dstBasename = path.basename(dstFolderPath)
  let dstExt = path.extname(srcFilePath)

  let pairs = [
    // project file
    { from: srcFilePath, to: path.join(dstFolderPath, `${dstBasename}${dstExt}`) },

    // interior files
    ...files.map(from => ({
      from: from,
      to: from.replace(srcFolderPath, dstFolderPath)
    }))
  ]

  if (!fs.existsSync(dstFolderPath)) {
    throw new Error(`ENOENT: could not find destination folder ${dstFolderPath}`)
  }

  pairs.forEach(({ from, to }) => {
    if (fs.existsSync(from)) {
      fs.copySync(from, to)
    } else {
      if (!options.ignoreMissing) {
        throw new Error(`ENOENT: could not find source file ${from}`)
      }
    }
  })
}

module.exports = {
  getFilesUsedByProject,
  copyProject
}
