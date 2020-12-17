
import path from 'path'
import fs from 'fs-extra'
import log from '../../shared/storyboarder-electron-log'
import ModelLoader from '../../services/model-loader'

const CopyFile = (storyboarderFilePath, absolutePath, type) => {
    let expectedFilepath = absolutePath
    if (ModelLoader.needsCopy({model: expectedFilepath, type})) {
      let src = expectedFilepath
      let dst = path.join(
        path.dirname(storyboarderFilePath),
        ModelLoader.projectFolder(type),
        path.basename(expectedFilepath)
      )
      log.info('will copy from', src, 'to', dst)
      // make sure the path exists
      fs.ensureDirSync(path.dirname(dst))
      // as long as they are different files, we need to copy them
      if (src !== dst) {

        log.info(`copying model file from ${src} to ${dst}`)
        fs.copySync(src, dst, { overwrite: true, errorOnExist: false })
      }
      // update it in the data
      return path.join(
        ModelLoader.projectFolder(type),
        path.basename(dst)
      ).split('\\').join('/')
    }
    
    return absolutePath.split('\\').join('/')
}

export default CopyFile
