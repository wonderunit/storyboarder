import path from 'path'
import fs from 'fs-extra'
const saveDataURLtoFile = (dataURL, filename, type, boardPath, async = false) => {
    let imageData = dataURL.replace(/^data:image\/\w+;base64,/, '')
    fs.ensureDirSync(path.join(path.dirname(boardPath), type))
    let imageFilePath = path.join(path.dirname(boardPath), type, filename)
    if(!async) {
      fs.writeFileSync(imageFilePath, imageData, 'base64')
    } else {
      fs.writeFile(imageFilePath, imageData, 'base64')
    }

}
const saveDataURLtoTempFile = (dataURL, boardPath, updateObject, object) => {
  let imageData = dataURL.replace(/^data:image\/\w+;base64,/, '')
  if(object.userData.tempImagePath) {
    let tempImageFilePath = path.join(path.dirname(boardPath), 'models', 'images', object.userData.tempImagePath)
    fs.remove(tempImageFilePath)
  }
  let tempFilename = `temp_${object.userData.id}-${Date.now()}-texture.png`
  object.userData.tempImagePath = tempFilename
  let filePath = path.join(path.dirname(boardPath), 'models','images')
  let imageFilePath = path.join(filePath, tempFilename)
  fs.ensureDirSync(filePath)
  fs.writeFileSync(imageFilePath, imageData, 'base64')
  let projectDir = path.dirname(boardPath)
  let assetsDir = path.join(projectDir, 'models', 'images')
  fs.ensureDirSync(assetsDir)
  let dst = path.join(assetsDir, path.basename(imageFilePath))
  let id = path.relative(projectDir, dst)
  updateObject(object.userData.id, {imageAttachmentIds: [id]})

}
export { saveDataURLtoFile, saveDataURLtoTempFile }