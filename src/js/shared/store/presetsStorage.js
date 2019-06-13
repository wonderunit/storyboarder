const { app } = require('electron').remote
const fs = require('fs')
const path = require('path')

const getPresetsFolderPath = () => path.join(app.getPath('userData'), 'presets')

const getScenePresetsFilePath = () => path.join(getPresetsFolderPath(), 'scenes.json')
const getCharacterPresetsFilePath = () => path.join(getPresetsFolderPath(), 'characters.json')
const getPosePresetsFilePath = () => path.join(getPresetsFolderPath(), 'poses.json')

module.exports = {
  loadScenePresets: () => {
    let filepath = getScenePresetsFilePath()
    if (fs.existsSync(filepath)) {
      let string = fs.readFileSync(filepath)
      let data = JSON.parse(string)
      return { scenes: data }
    } else {
      return { scenes: undefined }
    }
  },

  saveScenePresets: ({ scenes }) => {
    if (!fs.existsSync(getPresetsFolderPath())) { fs.mkdirSync(getPresetsFolderPath()) }

    let string = JSON.stringify(scenes, null, 2)
    fs.writeFileSync(getScenePresetsFilePath(), string)
  },


  loadCharacterPresets: () => {
    let filepath = getCharacterPresetsFilePath()
    if (fs.existsSync(filepath)) {
      let string = fs.readFileSync(filepath)
      let data = JSON.parse(string)
      return { characters: data }
    } else {
      return { characters: undefined }
    }
  },

  saveCharacterPresets: ({ characters }) => {
    if (!fs.existsSync(getPresetsFolderPath())) { fs.mkdirSync(getPresetsFolderPath()) }

    let string = JSON.stringify(characters, null, 2)
    fs.writeFileSync(getCharacterPresetsFilePath(), string)
  },


  loadPosePresets: () => {
    let filepath = getPosePresetsFilePath()
    if (fs.existsSync(filepath)) {
      let string = fs.readFileSync(filepath)
      let data = JSON.parse(string)
      return { poses: data }
    } else {
      return { poses: undefined }
    }
  },

  savePosePresets: ({ poses }) => {
    if (!fs.existsSync(getPresetsFolderPath())) { fs.mkdirSync(getPresetsFolderPath()) }

    let string = JSON.stringify(poses, null, 2)
    fs.writeFileSync(getPosePresetsFilePath(), string)
  }
}
