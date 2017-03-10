/*
UNDO STACK

TODO:
  add music feedback emmisions

Inspired by:
http://redux.js.org/docs/recipes/ImplementingUndoHistory.html
https://github.com/omnidan/redux-undo/blob/master/src/reducer.js
https://github.com/TheSeamau5/elm-undo-redo/blob/master/src/UndoList.elm
*/

const EventEmitter = require('events').EventEmitter
module.exports = new EventEmitter()

const util = require('./utils/index.js')

class UndoList {
  constructor () {
    this.state = {
      past: [],
      present: null,
      future: []
    }
    this.maxLength = 20
  }
  
  lengthWithoutFuture () {
    return this.state.past.length + 1
  }

  undo () {
    const { past, present, future } = this.state

    if (past.length <= 0) return

    const newFuture = present != null
      ? [
        present,
        ...future
      ] : future
    
    const newPresent = past[past.length - 1]

    // remove last element from past
    const newPast = past.slice(0, past.length - 1)

    this.state = {
      past: newPast,
      present: newPresent,
      future: newFuture
    }

    this.print()
  }
  
  redo () {
    const { past, present, future } = this.state

    if (future.length <= 0) return

    const newPast = present != null
      ? [
        ...past,
        present
      ] : past

    const newPresent = future[0]

    // remove element from future
    const newFuture = future.slice(1, future.length)

    this.state = {
      future: newFuture,
      present: newPresent,
      past: newPast
    }

    this.print()
  }

  insert (value) {
    let { past, present, future } = this.state
    
    const historyOverflow = this.lengthWithoutFuture() >= this.maxLength

    const pastSliced = past.slice(historyOverflow ? 1 : 0)
    const newPast = present != null
      ? [
        ...pastSliced,
        present
      ] : pastSliced

    this.state = {
      past: newPast,
      present: value,
      future: []
    }
    
    this.print()
  }
  
  print () {
    const { past, present, future } = this.state
    if (!this.debugEl) {
      this.debugEl = document.createElement('div')
      this.debugEl.style = `
        position: absolute;
        top: 0;
        right: 0;
        padding: 10px;
        font-family: monospace;
        font-size: 11px;
        width: 500px;
        background-color: black;
        color: white;
        white-space: pre;
        line-height: 15px;
      `
      document.body.appendChild(this.debugEl)
    }

    let clear = () =>
      this.debugEl.innerHTML = ''

    let trace = (...args) =>
      this.debugEl.innerHTML += '<div>' + args.join(' ') + '</div>'

    let boardIndexes = arr =>
      arr.map(b => parseInt(b.url.replace('board-', ''), 10)).join(', ')
    
    let stringOf = value =>
      util.isUndefined(value) ? '(none)' : value
    
    let describe = state => {
      if (state.type == 'image') {
        return [state.type, `sceneId:${stringOf(state.sceneId)}`, `imageId:${stringOf(state.imageId)}`, `layerId:${stringOf(state.layerId)}`, `imageBitmap:${state.imageBitmap.id}`].join(' ')
      } else if (state.type == 'scene') {
        return [state.type, boardIndexes(state.sceneData.boards)].join(' ')
      }
    }

    clear()
    let n = 0
    for (let state of past) {
      trace(' ', n++, describe(state))
    }

    trace('▸', n++, describe(this.state.present))

    for (let state of future) {
      trace(' ', n++, describe(state))
    }
  }
}

let undoList = new UndoList()

const addImageData = (sceneId, imageId, layerId, imageBitmap) => {
  undoList.insert({
    type:'image', 
    sceneId: sceneId, 
    imageId: imageId,
    layerId: layerId, 
    imageBitmap: imageBitmap // NOTE this is actually a reference to an HTMLCanvas object
  })
}

const addSceneData = (sceneId, sceneDataRef) => {
  let sceneData = util.stringifyClone(sceneDataRef)
  undoList.insert({
    type: 'scene', 
    sceneId,
    sceneData
  })
}

const undo = () => {
  undoList.undo()
  let state = undoList.state.present
  module.exports.emit('undo', state)
}

const redo = () => {
  undoList.redo()
  let state = undoList.state.present
  module.exports.emit('redo', state)
}

module.exports.addImageData = addImageData
module.exports.addSceneData = addSceneData
module.exports.undo = undo
module.exports.redo = redo
