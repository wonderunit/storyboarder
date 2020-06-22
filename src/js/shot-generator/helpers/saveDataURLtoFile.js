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
export default saveDataURLtoFile;