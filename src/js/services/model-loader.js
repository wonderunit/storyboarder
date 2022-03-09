const path = require('path')

const isCustomModel = string => {
  const { root, dir, base, ext, name } = path.parse(string)
  if (dir && dir !== '') {
    if (ext && ext !== '') {
      // { model: '/path/to/custom/model.glb' } // path and extension; load directly
      return true
    } else {
      // { model: '/path/to/custom/model' } // path and no extension -- fail, shouldn't be allowed
      throw new Error('invalid model file path for file without extension')
    }
  } else {
    if (ext && ext !== '') {
      // { model: 'model.glb' } // no path and extension
      throw new Error('invalid model file without path')
    } else {
      // { model: 'box' } // no path and no extension; use built-in model
      return false
    }
  }
}

const isUserFile = string => {
  const { dir, ext } = path.parse(string)
  if (dir && dir !== '') {
    if (ext && ext !== '') {
      return true
    } else {
      throw new Error('invalid file path, missing extension ' + string)
    }
  } else {
    if (ext && ext !== '') {
      throw new Error('invalid file path ' + string)
    } else {
      return false
    }
  }
}

// TODO could use app.getAppPath() instead?
//
// const { app } = require('@electron/remote')
// path.join(app.getAppPath(), 'src', 'data', 'shot-generator')

const pathToShotGeneratorData =
  path.join(window.__dirname, 'data', 'shot-generator')

// calculate filepath
const builtInFolder = type => ({
  'object': path.join(pathToShotGeneratorData, 'objects'),
  'character': path.join(pathToShotGeneratorData, 'dummies', 'gltf'),
  'attachable': path.join(pathToShotGeneratorData, 'attachables'),
  'xr': path.join(pathToShotGeneratorData, 'xr')
}[type])

const projectFolder = type => ({
  'object': path.join('models', 'objects'),
  'character': path.join('models', 'characters'),
  'environment': path.join('models', 'environments'),
  'attachable': path.join('models', 'attachables')
}[type])

const modelIsInProjectFolder = ({ model, type }) =>
  // the relative folder name of the model file ...
  path.normalize(path.dirname(model)) ===
  // ... is the same as the relative folder name where we expect models ...
  path.normalize(projectFolder(type))


const getFilepathForModel = ({ model, type }, { storyboarderFilePath }) => {
  // is the model built-in?
  if (!isCustomModel(model)) {
    return path.join(builtInFolder(type), `${model}.glb`)

  // is the model custom?
  } else {
    // does it have an absolute path? (e.g.: from an old save file we need to migrate)
    if (path.isAbsolute(model)) {
        return model

    // is it a relative path, and the file is in the models/* folder already?
    } else if (modelIsInProjectFolder({ model, type })) {
      // but the actual filepath we look for needs to be absolute
      return path.join(path.dirname(storyboarderFilePath), model)

    } else {
      throw new Error('Could not find model file', { model, type })
    }
  }
}

const needsCopy = ({ model, type }) => {
  // is it built-in?
  if (!isCustomModel(model)) {
    return false

  } else {
    // does it have an absolute path? (e.g.: from an old save file we need to migrate)
    if (path.isAbsolute(model)) {
      // ... then we need to copy it to the models/* folder and change its path
      return true

    // is it a relative path, and the file is in the models/* folder already?
  } else if (modelIsInProjectFolder({ model, type })) {
      // ... then we can load it as-is
      return false

    } else {
      throw new Error('Could not find model file for copy', { model, type })
    }
  }
}

module.exports = {
  isCustomModel,

  isUserFile,

  getFilepathForModel,
  needsCopy,

  projectFolder
}
