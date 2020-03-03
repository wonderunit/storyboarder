
import ModelLoader from '../../services/model-loader'
const filepathFor = model => 
  ModelLoader.getFilepathForModel(
    { model: model.id, type: model.type },
    { storyboarderFilePath: null })
export { filepathFor }
