const fs = require('fs-extra')
const path = require('path')

const last = arr => arr[arr.length - 1]

const getDirectories = filepath =>
  fs.readdirSync(filepath)
    .filter(file =>
      fs.statSync(path.join(filepath, file)).isDirectory())

const parse = {
  titlePage: script => script.find(({ type }) => type == 'title'),
  sceneTitleFromFilePath: storyboarderFilePath => {
    let parts = path.basename(
      storyboarderFilePath,
      path.extname(storyboarderFilePath)
    ).split('-')
    return parts.length > 1
      ? parts.slice(0, -1).join('-')
      : parts[0]
  }
}

const scenesFromScriptData = ({ filepath, current, scriptData }) => {
  let directoriesBySceneId = 
    Object.fromEntries(
      getDirectories(path.join(path.dirname(filepath), 'storyboards'))
        .filter(dir => dir.match(/-backup$/) == null)
        .map(name => [last(name.split('-')), name])
    )

  return scriptData
    .filter(({ type }) => type == 'scene')
    .map(scene => {
      // if the scene is currently in memory
      if (scene.scene_number == current.sceneNumber) {
        return {
          // use in-memory data
          ...current,
          // but provide some missing values
          sceneId: scene.scene_id,
          title: scene.slugline
        }
      } else {
        // load data from disk
        let dir = directoriesBySceneId[last(scene.scene_id.split('-'))]
        let storyboarderFilePath = path.join(path.dirname(filepath), 'storyboards', dir, `${dir}.storyboarder`)
        return {
          sceneId: scene.scene_id,
          sceneNumber: scene.scene_number,
          storyboarderFilePath,
          title: scene.slugline,
          data: JSON.parse(fs.readFileSync(storyboarderFilePath, 'utf-8'))
        }
      }
    })
}

const getProjectData = async ({ currentFilePath, projectData }) => {
  let {
    currentBoardData,
    currentScene,
    currentStoryboarderFilePath,
    scriptData
  } = projectData

  // for in-memory scene
  let current = {
    sceneId: null,
    sceneNumber: currentScene + 1,
    storyboarderFilePath: currentStoryboarderFilePath,
    data: currentBoardData,
    title: parse.sceneTitleFromFilePath(currentStoryboarderFilePath)
  }

  return {
    root: path.dirname(scriptData ? currentFilePath : currentStoryboarderFilePath),
    script: scriptData,
    title: scriptData ? parse.titlePage(scriptData).text : null,
    scriptFilepath: scriptData ? currentFilePath : null,
    scenes: scriptData
      ? scenesFromScriptData({ filepath: currentFilePath, current, scriptData })
      : [current]
  }
}

module.exports = {
  getProjectData
}
