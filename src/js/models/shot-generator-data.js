const ModelLoader = require('../services/model-loader')


// getExportableMediaFilenames
//
// returns relative filenames of all exportable Shot Generator media in the project
//
// NOTE we're not specifically handling the case where the model points to
//      an absolute path outside of the project. that only happened in older beta
//      versions of the software.
//
const getExportableMediaFilenames = sg => {
  let results = []
  for (let sceneObject of Object.values(sg.data.sceneObjects)) {
    if (
      sceneObject.model &&
      ModelLoader.isCustomModel(sceneObject.model)
    ) {
      results.push(sceneObject.model)
    }
  }

  if (
    sg.data.world.environment.file &&
    ModelLoader.isCustomModel(sg.data.world.environment.file)
  ) {
    results.push(sg.data.world.environment.file)
  }
  
  return results
}

module.exports = {
  getExportableMediaFilenames
}
