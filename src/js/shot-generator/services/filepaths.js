const path = require('path')

function getSystemDirectoryFor (pathToShotGeneratorData) {
  return function systemDirectoryFor (type) {
    return {
      'object': path.join(pathToShotGeneratorData, 'objects'),
      'character': path.join(pathToShotGeneratorData, 'dummies', 'gltf'),
      'attachable': path.join(pathToShotGeneratorData, 'attachables'),
      'emotion': path.join(pathToShotGeneratorData, 'emotions'),
      'xr': path.join(pathToShotGeneratorData, 'xr'),
      'image': path.join(pathToShotGeneratorData, 'images')
    }[type]
  }
}

function getProjectDirectory (base) {
  return function projectDirectoryFor (type) {
    return {
      'object': path.join(base, 'models', 'objects'),
      'character': path.join(base, 'models', 'characters'),
      'environment': path.join(base, 'models', 'environments'),
      'attachable': path.join(base, 'models', 'attachables'),
      'emotion': path.join(base, 'models', 'emotions'),
      'image': path.join(base, 'models', 'images')
    }[type]
  }
}

/**
 * @example
 * const getUserPresetPath = createUserPresetPathResolver(remote.app.getPath('userData'))
 * getUserPresetPath('emotions', 'texture.png')
 */
function createUserPresetPathResolver (userDataFilePath) {
  /**
   * @param {string} type
   * @param {string} basename
   */
  return function getUserPresetPath (type, basename = '') {
    return path.join(userDataFilePath, 'presets', type, basename)
  }
}

/**
  * @param {string} appDirectory
  * @param {string} storyboarderFilePath
 * @example
 * const getAssetPath = createAssetPathResolver(window.__dirname, storyboarderFilePath)
 * getAssetPath('emotion', 'emotions-none.png')
 * getAssetPath('attachable', 'models/attachments/model.glb')
 */
function createAssetPathResolver (appDirectory, storyboarderFilePath) {
  const systemDirectoryFor = getSystemDirectoryFor(path.join(appDirectory, 'data', 'shot-generator'))
  const projectDirectoryFor = getProjectDirectory(path.dirname(storyboarderFilePath))

  /**
   * @param {string} type
   * @param {string} filepath
   */
  return function getAssetPath (type, filepath = '') {
    if (filepath.match(/\//)) {
      // user paths
      return path.join(projectDirectoryFor(type), path.basename(filepath))
    } else {
      // system paths
      return path.join(systemDirectoryFor(type), path.basename(filepath))
    }
  }
}

module.exports = {
  createUserPresetPathResolver,
  createAssetPathResolver
}
