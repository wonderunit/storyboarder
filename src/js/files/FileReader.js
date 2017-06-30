const path = require('path')
const fs = require('fs')
const readPsd = require('ag-psd').readPsd;
const initializeCanvas = require('ag-psd').initializeCanvas;

/**
 * Retrieve a base 64 representation of an image file
 *  
 * @param {string} filepath 
 * @returns {string}
 */
let getBase64ImageDataFromFilePath = (filepath) => {
  let arr = filepath.split(path.sep)
  let filename = arr[arr.length-1]
  let filenameParts =filename.toLowerCase().split('.')
  let type = filenameParts[filenameParts.length-1]

  switch(type) {
    case "png":
      return getBase64TypeFromFilePath('png', filepath)
    case "jpg":
      return getBase64TypeFromFilePath('jpg', filepath)
    case "psd":
      return getBase64TypeFromPhotoshopFilePath(filepath)
  }
}

let getBase64TypeFromFilePath = (type, filepath) => {
  if (!fs.existsSync(filepath)) return null

  // via https://gist.github.com/mklabs/1260228/71d62802f82e5ac0bd97fcbd54b1214f501f7e77
  let data = fs.readFileSync(filepath).toString('base64')
  return `data:image/${type};base64,${data}`
}

let getBase64TypeFromPhotoshopFilePath = (filepath) => {
  if (!fs.existsSync(filepath)) return null

  initializeCanvas((width, height) => {
        let canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
      });
  
  let psd
  try {
    const buffer = fs.readFileSync(filepath)
    psd = readPsd(buffer)
  } catch(exception) {
    console.error(exception)
    return null
  }
  
  if(!psd || !psd.children) {
    return;
  }
  let canvas = document.createElement('canvas')
  canvas.width = psd.width
  canvas.height = psd.height
  let ctx = canvas.getContext('2d');
  for(let layer of psd.children) {
    if(layer.canvas) {
      ctx.drawImage(layer.canvas, layer.left, layer.top);
    }
  }
  return canvas.toDataURL()
}

module.exports = {
  getBase64ImageDataFromFilePath,
}