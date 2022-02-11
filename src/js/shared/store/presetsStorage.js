const { app } = require('@electron/remote')
const fs = require('fs')
const path = require('path')

const getPresetsFolderPath = () => path.join(app.getPath('userData'), 'presets')

const getScenePresetsFilePath = () => path.join(getPresetsFolderPath(), 'scenes.json')
const getCharacterPresetsFilePath = () => path.join(getPresetsFolderPath(), 'characters.json')
const getPosePresetsFilePath = () => path.join(getPresetsFolderPath(), 'poses.json')
const getHandPosePresetsFilePath = () => path.join(getPresetsFolderPath(), 'hand-poses.json')
const getEmotionsPresetsFilePath = () => path.join(getPresetsFolderPath(), 'emotions.json')

// versions 1.13.0 and before had no priority field for poses
// ensure that all poses have a priority field
const migratePosePresets = poses => {
  for (let key of Object.keys(poses)) {
    let pose = poses[key]
    pose.priority = pose.priority == null ? 0 : pose.priority
  }
  return poses
}

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
      migratePosePresets(data)
      return { poses: data }
    } else {
      return { poses: undefined }
    }
  },

  savePosePresets: ({ poses }) => {
    if (!fs.existsSync(getPresetsFolderPath())) { fs.mkdirSync(getPresetsFolderPath()) }

    migratePosePresets(poses)
    let string = JSON.stringify(poses, null, 2)
    fs.writeFileSync(getPosePresetsFilePath(), string)
  },

  loadHandPosePresets: () => {
    let filepath = getHandPosePresetsFilePath()
    if (fs.existsSync(filepath)) {
      let string = fs.readFileSync(filepath)
      let data = JSON.parse(string)
      migratePosePresets(data)
      return { handPoses: data }
    } else {
      return { handPoses: undefined }
    }
  },

  saveHandPosePresets: ({ handPoses }) => {
    if (!fs.existsSync(getPresetsFolderPath())) { fs.mkdirSync(getPresetsFolderPath()) }

    migratePosePresets(handPoses)
    let string = JSON.stringify(handPoses, null, 2)
    fs.writeFileSync(getHandPosePresetsFilePath(), string)
  },

  loadEmotionsPresets: () => {
    let filepath = getEmotionsPresetsFilePath()
    if (fs.existsSync(filepath)) {
      let string = fs.readFileSync(filepath)
      let data = JSON.parse(string)
      return { emotions: data }
    } else {
      return { emotions: undefined }
    }
  },

  saveEmotionsPresets: ({ emotions }) => {
    if (!fs.existsSync(getPresetsFolderPath())) { fs.mkdirSync(getPresetsFolderPath()) }

    let string = JSON.stringify(emotions, null, 2)
    fs.writeFileSync(getEmotionsPresetsFilePath(), string)
  }

}
