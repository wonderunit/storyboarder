const path = require('path')

function getSystemDirectoryFor (pathToShotGeneratorData) {
  return function systemDirectoryFor (type) {
    return {
      'object': path.join(pathToShotGeneratorData, 'objects'),
      'character': path.join(pathToShotGeneratorData, 'dummies', 'gltf'),
      'attachable': path.join(pathToShotGeneratorData, 'attachables'),
      'emotions': path.join(pathToShotGeneratorData, 'emotions'),
      'xr': path.join(pathToShotGeneratorData, 'xr')
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
      'emotions': path.join(base, 'models', 'emotions')
    }[type]
  }
}

/**
 * @example
 * const getPresetPath = createPresetPathResolver(remote.app.getPath('userData'))
 * getPresetPath('emotions', 'emotions-none.png')
 */
function createPresetPathResolver (userDataFilePath) {
  /**
   * @param {string} type
   * @param {string} basename
   */
  return function getPresetPath (type, basename = '') {
    return path.join(userDataFilePath, 'presets', type, basename)
  }
}

/**
 * @example
 * const getAssetPath = createAssetPathResolver(window.__dirname, storyboarderFilePath)
 * getAssetPath('attachable', 'models/attachments/model.glb')
 */
function createAssetPathResolver (appDirectory, storyboarderFilePath) {
  const systemDirectoryFor = getSystemDirectoryFor(path.join(appDirectory, 'data', 'shot-generator'))
  const projectDirectoryFor = getProjectDirectory(path.dirname(storyboarderFilePath))

  /**
   * @param {string} type
   * @param {string} basename
   */
  return function getAssetPath (type, basename = '') {
    if (basename.match(/\//)) {
      // user paths
      return path.join(projectDirectoryFor(type), basename)
    } else {
      // system paths
      return path.join(systemDirectoryFor(type), basename)
    }
  }
}

module.exports = {
  createPresetPathResolver,
  createAssetPathResolver
}
