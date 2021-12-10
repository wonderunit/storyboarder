
import path from 'path'
import fs from 'fs-extra'
import log from '../../shared/storyboarder-electron-log'
import ModelLoader from '../../services/model-loader'
import CopyFile from './CopyFile'



const getDir = () => {

}


const createDir = () => {

}

const envFilesPatterns = {
    names: ['nx','ny','nz','px','py','pz'],
    avaliableExt: ['.jpeg','.jpg','.png']
}

const checkFileName = (fileInfo) => {
    for (let i = 0; i < envFilesPatterns.names.length; i++){
        if (fileInfo.name === envFilesPatterns.names[i]) return envFilesPatterns.names[i]
    }
    return null
}

const checkFileExt = (fileInfo) => {
    for (let i = 0; i < envFilesPatterns.avaliableExt.length; i++){
        if (fileInfo.ext === envFilesPatterns.avaliableExt[i].toLowerCase()) return envFilesPatterns.avaliableExt[i].toLowerCase()
    }
    return null
}



const CopyFiles = ({storyboarderFilePath, absolutePathInfo, type}) => {

    // console.log ('CopyFiles',storyboarderFilePath,absolutePathInfo,type)

    const { file, files } = absolutePathInfo

    const mode = (!files.length) ? null : (file === undefined) ? 'MULTISELECT' : (path.extname(file) !== '') ? 'FILE' : 'DIR'

    console.log ('CopyFiles', storyboarderFilePath, absolutePathInfo, type, mode)

    if (mode){

        const absolutePath = []

        switch (mode) {
            case 'FILE':
                absolutePath[0] = CopyFile(storyboarderFilePath, file, type)
                break
            case 'DIR':
            
                fs.readdir(files[0], (err, files) => {
                    console.log(mode,files)
                    files.forEach(file => {
                      console.log(file)
                    })
                })
                
                break
            case 'MULTISELECT':
                if (files.length == envFilesPatterns.names.length){
                    for (let i=0; i < files.length; i++){
                        const fileInfo = path.parse(files[i])

                        if ( checkFileExt(fileInfo) && checkFileName(fileInfo)){
                            absolutePath[i] = CopyFile(storyboarderFilePath, files[i], type)
                        } else {
                            console.error('Environment map: no match ext or file name') 
                            return []
                        }

                    }
                } else {
                    console.error('Environment map: you must choose 6 files') 
                    return []
                }
                break
            default:
                absolutePath = []
                break
        }

        return absolutePath 
    } 

    return []

}

export default CopyFiles