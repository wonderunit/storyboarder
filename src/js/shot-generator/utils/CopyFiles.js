
import path from 'path'
import fs from 'fs-extra'
import ModelLoader from '../../services/model-loader'
import CopyFile from './CopyFile'

const createNewDir = (storyboarderPath,type, newDirName = 'someFolder') => {

    const rootPath = path.join(storyboarderPath, ModelLoader.projectFolder(type))
    const rootFolderFiles = fs.readdirSync(rootPath).filter(file => file == newDirName)

    if (rootFolderFiles.length>0) return path.join('/',newDirName)

    fs.mkdir(path.join(rootPath,'/',newDirName))

    return path.join('/',newDirName)
}

export const envFilesPatterns = {
    names: ['px','nx','py', 'ny', 'pz','nz'],
    avaliableExt: ['.jpeg','.jpg','.png','.exr','.hdr']
}

const checkFileExt = (fileInfo) => {
    for (let i = 0; i < envFilesPatterns.avaliableExt.length; i++){
        if (fileInfo.ext.toLowerCase() === envFilesPatterns.avaliableExt[i].toLowerCase()) return envFilesPatterns.avaliableExt[i].toLowerCase()
    }
    return null
}

const checkFileName = (fileInfo) => {
    for (let i = 0; i < envFilesPatterns.names.length; i++){
        if (fileInfo.name === envFilesPatterns.names[i]) return envFilesPatterns.names[i]
    }
    return null
}

export const CopyFiles = ({storyboarderFilePath, absolutePathInfo, type}) => {

    const { file, files } = absolutePathInfo

    const mode = (!files.length) ? null : (file === undefined) ? 'MULTISELECT' : (path.extname(file) !== '') ? 'FILE' : 'DIR'

    if (mode){

        const absolutePath = []

        try {
            switch (mode) {
                case 'FILE':
                    if (checkFileExt(path.parse(file))) {
                        absolutePath[0] = CopyFile(storyboarderFilePath, file, type)
                    } else {
                        absolutePath = [] 
                        throw new Error('Add Environment map: no match ext')
                    }
                    break
                case 'DIR':
                case 'MULTISELECT':
                    const filteredFiles = (mode === "DIR") ? 
                        fs.readdirSync(files[0])
                            .filter((file) => checkFileExt(path.parse(file)))
                            .filter((file) => checkFileName(path.parse(file))) 
                        : 
                        files
                            .filter((file) => checkFileExt(path.parse(file)))
                            .filter((file) => checkFileName(path.parse(file)))
    
                    const filesParentFolderName = (mode === "DIR") ? path.parse(file).base : path.parse(path.dirname(files[0])).base
    
                    if (filteredFiles.length < envFilesPatterns.names.length ){
                        throw new Error(`Add Environment map: not enough matching files. Number of files must be: ${envFilesPatterns.names.length}. Match ext: ${envFilesPatterns.avaliableExt}. Match names: ${envFilesPatterns.names}. `)
                    } else if (filteredFiles.length == envFilesPatterns.names.length ){
                        const newDir = createNewDir(path.dirname(storyboarderFilePath), type, filesParentFolderName)
                        for (let i=0; i<filteredFiles.length;i++){
                            const filePath = (mode === "DIR") ? files[0] + '/' + filteredFiles[i] : filteredFiles[i]
                            absolutePath[i] = CopyFile(storyboarderFilePath, filePath, type, newDir)
                        }
                    }
                    break
                default:
                    absolutePath = []
                    break
            }
        } catch (error) {
            console.error(error)
        }

        return absolutePath 
    } 

    return []

}

export default CopyFiles