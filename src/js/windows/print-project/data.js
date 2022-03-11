/*
ProjectData
  root: String
  script: Object
  title: String
  scriptFilepath
  scenes: [SceneData]

SceneData
  sceneId: String,
  sceneNumber: Number,
  storyboarderFilePath: String
  title: String
  data: Object
*/
const fs = require('fs-extra')
const path = require('path')

const last = arr => arr[arr.length - 1]

const getDirectories = filepath =>
  fs.readdirSync(filepath)
    .filter(file =>
      fs.statSync(path.join(filepath, file)).isDirectory())

const parse = {
  titlePage: script => script.find(({ type }) => type == 'title'),
  sceneTitleFromFilePath: storyboarderFilePath =>
    path.basename(
      storyboarderFilePath,
      path.extname(storyboarderFilePath)
    )
}

const scenesFromScriptData = (
  { filepath, scriptData },
  { sceneNumber, storyboarderFilePath, data }
) => {
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
      if (scene.scene_number == sceneNumber) {
        return {
          // merge scene values from script
          sceneId: scene.scene_id,
          title: scene.slugline,

          // use in-memory values for the rest
          sceneNumber,
          storyboarderFilePath,
          data
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

  let localSceneDataFragment = {
    sceneNumber: currentScene + 1,
    storyboarderFilePath: currentStoryboarderFilePath,
    data: currentBoardData
  }

  return {
    root: path.dirname(scriptData ? currentFilePath : currentStoryboarderFilePath),
    script: scriptData,
    title: scriptData ? parse.titlePage(scriptData).text : null,
    scriptFilepath: scriptData ? currentFilePath : null,
    scenes: scriptData
      ? scenesFromScriptData(
          {
            filepath: currentFilePath,
            scriptData
          },
          localSceneDataFragment
        )
      : [{
          sceneId: null,
          title: parse.sceneTitleFromFilePath(currentStoryboarderFilePath),

          ...localSceneDataFragment
        }]
  }
}

module.exports = {
  getProjectData
}
