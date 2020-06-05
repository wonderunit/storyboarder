import path from 'path'
import fs from 'fs-extra'
const saveDataURLtoFile = (dataURL, filename, type, boardPath) => {
    let imageData = dataURL.replace(/^data:image\/\w+;base64,/, '')
    fs.ensureDirSync(path.join(path.dirname(boardPath), type))
    let imageFilePath = path.join(path.dirname(boardPath), type, filename)
    fs.writeFileSync(imageFilePath, imageData, 'base64')
  }
export default saveDataURLtoFile;