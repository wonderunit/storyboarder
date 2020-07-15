const path = require('path')
const isUserModel = model => !!model.match(/(\/|\\)/)

const getFilePathForImages = ({ type, volumeImageAttachmentIds, imageAttachmentIds}, storyboarderFilePath ) => {
    let paths = []
    let ids = volumeImageAttachmentIds ? volumeImageAttachmentIds : imageAttachmentIds
    if(!ids.length) return []
    for(let i = 0; i < ids.length; i++ ){
        let model = ids[i]
        if(!isUserModel(model)) {
            let folderName = type === "volume" ? "volumes" : "images"
            let extension = type === "volume" ? ".jpg" : ".png"
            paths.push( path.join(window.__dirname, "data", "shot-generator", folderName, model + extension))
        } else {
            paths.push(path.join(path.dirname(storyboarderFilePath), model)) 
        }
    }
    return paths
}

export { getFilePathForImages }
