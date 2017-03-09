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

const trim = () => {
  // if we're not at the start of the undo stack...
  if (undoPosition != 0) {
    // ... reset the stack to prepare for the next push
    var len = undoStack.length
    undoStack = undoStack.slice(0, len - undoPosition)
    undoPosition = 0
  }
  // if we have too many undo states in the stack ...
  if (undoStack.length >= MAXUNDOS) {
    // ... trim them
    undoStack = undoStack.slice(1, undoStack.length)
  }
}

const addImageData = (sceneId, imageId, layerId, imageBitmap)=> {
  trim()
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

const addSceneData = (sceneId, sceneDataRef) => {
  let sceneData = util.stringifyClone(sceneDataRef)
  trim()
  undoStack.push({
    type: 'scene', 
    sceneId,
    sceneData
  })
}

const undo = ()=> {
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

const redo = ()=> {
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

const applyUndoStateForScene = (undoOrRedo, state) =>
  module.exports.emit(undoOrRedo, state)

module.exports.stack = undoStack
module.exports.addImageData = addImageData
module.exports.addSceneData = addSceneData
module.exports.undo = undo
module.exports.redo = redo