// TODO should this be part of ModelLoader?

const { dialog } = require('electron').remote
const fs = require('fs-extra')
const path = require('path')

const ModelLoader = require('../services/model-loader')

// FIXME 
//
// could use app.getAppPath(), which works for `npm start`
// but it won't work for `npm run shot-generator`
// see: https://github.com/electron-userland/electron-webpack/issues/243
//
// const { app } = require('electron').remote
// path.join(app.getAppPath(), 'src', 'data', 'shot-generator')
const pathToShotGeneratorData =
  path.join(__dirname, '..', '..', '..', 'src', 'data', 'shot-generator')

const pathToBuiltInModels = {
  character: path.join(pathToShotGeneratorData, 'dummies', 'gltf'),
     object: path.join(pathToShotGeneratorData, 'objects')
} 

const prepareFilepathForModel = async ({
  model,
  type,

  storyboarderFilePath,

  onFilePathChange
}) => {
  let resourceType = type + 's'
  let resourcePath = path.join(path.dirname(storyboarderFilePath), 'models', resourceType)

  let filepath
  let needsCopy = false

  // is the model built-in?
  if (!ModelLoader.isCustomModel(model)) {
    // easy, just load it from the models folder
    needsCopy = false
    filepath = path.join(pathToBuiltInModels[type], `${model}.glb`)

  // is the model custom?
  } else {
    // does it have an absolute path? (e.g.: from an old save file we need to migrate)
    if (path.isAbsolute(model)) {
      // ... then we need to copy it to the models/* folder and change its path
      needsCopy = true
      filepath = model

    // is it a relative path, and the file is in the models/* folder already?
    } else if (
      // the relative folder name of the model file ...
      path.normalize(path.dirname(model)) ===
      // ... is the same as the relative folder name where we expect models ...
      path.normalize(path.join('models', resourceType))
    ) {
      // ... then we can load it as-is
      needsCopy = false

      // but the actual filepath we look for needs to be absolute
      filepath = path.join(path.dirname(storyboarderFilePath), model)

    } else {
      throw new Error('Could not find model file')
    }
  }

  // so we know the absolute filepath, but what if it doesn’t exist?
  if (!fs.existsSync(filepath)) {
    // ... ask the artist to locate it
    try {
      filepath = await ModelLoader.ensureModelFileExists(filepath)

      // handle case where user relocated the file to the models/* folder
      if (
        // the absolute folder name of the model file ...
        path.resolve(path.normalize(path.dirname(filepath))) ===
        // ... is the same as the absolute folder name where we expect models of this type ...
        path.resolve(path.normalize(resourcePath))
      ) {
        // we don't need to copy it
        needsCopy = false

        // TODO DRY
        // but we should update the model path to be relative
        model = path.join('models', resourceType, path.basename(filepath))
        console.log(`setting model from absolute to relative model:${model} filepath:${filepath}`)
        onFilePathChange(model)
        return

      } else {
        needsCopy = true
      }

    } catch (error) {
      console.error(error)
      // cancellation by user
      dialog.showMessageBox({
        title: 'Failed to load',
        message: `Failed to load model ${model}`
      })
      return
    }
  }

  if (needsCopy) {
    try {
      // copy model file to models/* folder and change model path
      console.log('copying model file into models/')
      
      // make sure the path exists
      fs.ensureDirSync(resourcePath)

      let src = filepath
      let dst = path.join(resourcePath, path.basename(filepath))

      // as long as they are different files, we need to copy them
      if (src !== dst) {
        // prompt before overwrite
        if (fs.existsSync(dst)) {
          let choice = dialog.showMessageBox(null, {
            type: 'question',
            buttons: ['Yes', 'No'],
            message: 'Model file already exists. Overwrite?'
          })
          if (choice !== 0) {
            console.log('cancelled model file copy')
            throw new Error('Skipped')
          }
        }

        console.log(`copying model file from ${src} to ${dst}`)
        fs.copySync(src, dst, { overwrite: true, errorOnExist: false })
      }

      // update it in the data
      model = path.join('models', resourceType, path.basename(dst))
      console.log(`setting model prop to ${model}`)
      onFilePathChange(model)
      return

    } catch (err) {
      console.error(err)
      alert(err)
      return
    }
  }

  return filepath
}

module.exports = prepareFilepathForModel