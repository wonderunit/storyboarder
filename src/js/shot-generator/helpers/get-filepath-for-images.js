const path = require('path')
const fs = require('fs-extra')
const isUserModel = model => !!model.match(/(\/|\\)/)

const getFilePathForImages = ({ type, volumeImageAttachmentIds, imageAttachmentIds}, storyboarderFilePath ) => {
    let paths = []
    let ids = volumeImageAttachmentIds ? volumeImageAttachmentIds : imageAttachmentIds
    for(let i = 0; i < ids.length; i++ ){
        let model = ids[i]
        if(!isUserModel(model)) {
            let folderName = type === "volume" ? "volumes" : type === "image" ? "images" : "emotions"
            let extension = type === "volume" ? ".jpg" : ".png"
            paths.push( path.join(window.__dirname, "data", "shot-generator", folderName, model + extension))
        } else {
            let imagePath = path.join(path.dirname(storyboarderFilePath), model)
            if( fs.existsSync(imagePath)) {
                paths.push(imagePath) 
            }
        }
    }
    return paths
}

export { getFilePathForImages }
