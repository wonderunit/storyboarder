/*
UNDO STACK

TODO:
  add scene data undo/redo properly
  add scene specific undo/redo properly
  add music feedback emmisions
*/

const EventEmitter = require('events').EventEmitter
module.exports = new EventEmitter()

const util = require('./utils/index.js')

let undoStack = []
let undoPosition = 0
const MAXUNDOS = 100

let addImageData = (sceneId, imageId, layerId, imageBitmap)=> {
  if (undoPosition != 0) {
    var len = undoStack.length
    undoStack = undoStack.slice(0, len-undoPosition)
    undoPosition = 0
  }
  if (undoStack.length >= MAXUNDOS) {
    undoStack = undoStack.slice(1, undoStack.length)
  }
  var stackItem = {
    type:'image', 
    sceneId: sceneId, 
    imageId: imageId,
    layerId: layerId, 
    imageBitmap: imageBitmap
  }
  undoStack.push(stackItem)
  return stackItem
}

let addSceneData = (sceneId, sceneDataRef) => {
  let sceneData = util.stringifyClone(sceneDataRef)
  if (undoPosition != 0) {
    var len = undoStack.length
    undoStack = undoStack.slice(0, len - undoPosition)
    undoPosition = 0
  }
  if (undoStack.length >= MAXUNDOS) {
    undoStack = undoStack.slice(1, undoStack.length)
  }
  undoStack.push({
    type: 'scene', 
    sceneId,
    sceneData
  })
}

let applyUndoStateForScene = (undoOrRedo, state) =>
  module.exports.emit(undoOrRedo, state)

let undo = ()=> {
  if (undoPosition == 0) {
    var undoState = undoStack[undoStack.length-1]
    if (undoState.type == 'image') {
      var stackItem = addImageData(undoState.sceneId, undoState.imageId, undoState.layerId, null)
      undoPosition++
      createImageBitmap(document.getElementById(undoState.layerId)).then((val)=> {
        stackItem.imageBitmap = val
      })
    }
  }
  if (undoStack.length-undoPosition > 0) {
    undoPosition++
    var undoState = undoStack[undoStack.length-undoPosition]
    if (undoState.type == 'image') {
      // if sceneid go to that scene
      // if imageid go to that image
      // find layer context
      var layerContext = document.getElementById(undoState.layerId).getContext('2d')
      // draw imageBitmap into it
      layerContext.globalAlpha = 1
      layerContext.clearRect(0, 0, layerContext.canvas.width, layerContext.canvas.height);
      layerContext.drawImage(undoState.imageBitmap, 0,0)
    } else {
      // scene type
      applyUndoStateForScene('undo', undoState)
    }
  } else {
    
  }
}

let redo = ()=> {
  if ((undoStack.length-undoPosition) < (undoStack.length-1)) {
    undoPosition--
    var undoState = undoStack[undoStack.length-undoPosition]
    if (undoState.type == 'image') {
      // if sceneid go to that scene
      // if imageid go to that image
      // find layer context
      var layerContext = document.getElementById(undoState.layerId).getContext('2d')
      // draw imageBitmap into it
      layerContext.globalAlpha = 1
      layerContext.clearRect(0, 0, layerContext.canvas.width, layerContext.canvas.height);
      layerContext.drawImage(undoState.imageBitmap, 0,0)
    } else {
      // scene type
      applyUndoStateForScene('redo', undoState)
    }
  } else {
  }
}

module.exports.stack = undoStack
module.exports.addImageData = addImageData
module.exports.addSceneData = addSceneData
module.exports.undo = undo
module.exports.redo = redo