import fs from 'fs-extra'
import path from 'path'
import { useContext } from 'react'
import FilepathsContext from '../contexts/filepaths'
const useInsertImage = (initializeImage) => {
    const { getAssetPath } = useContext(FilepathsContext)
    const dragOver =  (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
    }
  
    const imageDrop = (e) => {
        for (const f of e.dataTransfer.files) { 
          let { name, ext } = path.parse( f.path)
          let imageId = THREE.Math.generateUUID()
          let imageProjectPath = path.join('models', 'images', name + ext)
          let imagePath = getAssetPath('image', imageProjectPath)
          fs.ensureDirSync(path.dirname(imagePath))
          if(!fs.existsSync(imagePath))
            fs.copyFileSync(f.path, imagePath)
          initializeImage(imageId, imageProjectPath)
        } 
    } 

    const saveImageFromClipboard = (blob) => {
      let imageId = THREE.Math.generateUUID()
      let imageProjectPath = path.join('models', 'images', `${imageId}-texture.png`)
      let imagePath = getAssetPath('image', imageProjectPath)
      let reader = new FileReader()
      reader.onload = function() {
        if(reader.readyState == 2) {
          let buffer = Buffer.from(reader.result)
          fs.ensureDirSync(path.dirname(imagePath))
          fs.writeFileSync(imagePath, buffer)
          initializeImage(imageId, imageProjectPath)
        }
      }
      reader.readAsArrayBuffer(blob)
    }

    const saveUrlImageFromClipboard =  async (url) => {
      let response = await fetch(url)
      response.blob().then((blob)=>{
        saveImageFromClipboard(blob)
      })
    }
  
    const createImageFromClipboard = (pasteEvent) => {

        if(pasteEvent.clipboardData == false) {
          return 
        }
        let items = pasteEvent.clipboardData.items
        if(items == undefined) {
          return 
        }
        for(let i = 0; i < items.length; i++) {
          let item = items[i] 
          if(item.type.indexOf("image") == -1) { 
            if (item.type.indexOf("plain") == -1) continue
              item.getAsString( (data) => {
                saveUrlImageFromClipboard(data)
              } )
          } else {
            let blob = item.getAsFile()
            saveImageFromClipboard(blob)
          }
        }
    }

    return { dragOver, imageDrop, createImageFromClipboard }
  
}

export { useInsertImage }