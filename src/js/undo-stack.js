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
    this.maxLength = 100

    this.debugMode = false
  }

  lengthWithoutFuture () {
    return this.state.past.length + 1
  }

  undo () {
    const { past, present, future } = this.state

    if (past.length <= 0) return

    const newFuture = present !== null
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

    if (this.debugMode) this.print()
  }
  
  redo () {
    const { past, present, future } = this.state

    if (future.length <= 0) return

    const newPast = present !== null
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

    if (this.debugMode) this.print()
  }

  insert (value) {
    const { past, present, future } = this.state

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

    if (this.debugMode) this.print()
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

const imageStateContextsEqual = (a, b) =>
  a && b &&
  a.type == 'image' && b.type == 'image' &&
  a.sceneId == b.sceneId &&
  a.imageId == b.imageId &&
  a.layerId == b.layerId

const addImageData = (isBefore, state) => {
  const newState = {
    type: 'image',
    sceneId: state.sceneId,
    imageId: state.imageId,
    layerId: state.layerId, 
    imageBitmap: state.imageBitmap // NOTE this is actually a reference to an HTMLCanvas object
  }

  // are we being asked to take a before snapshot?
  if (isBefore) {
    // ... but is the most recent state the same as the inserting state?
    if (undoList.state.present && // always store before state if we have no known snapshot
        imageStateContextsEqual(undoList.state.present, newState)) {
      return
    }
  }

  undoList.insert(newState)
}

const sceneStateContextsEqual = (a, b) =>
  a && b &&
  a.type == 'scene' && b.type == 'scene' &&
  a.sceneId == b.sceneId

const addSceneData = (isBefore, state) => {
  const newState = {
    type: 'scene',
    sceneId: state.sceneId,
    sceneData: state.boardData
  }

  // are we being asked to take a before snapshot?
  if (isBefore) {
    // ... but is the most recent state the same as the inserting state?
    if (undoList.state.present && // always store before state if we have no known snapshot
        sceneStateContextsEqual(undoList.state.present, newState)) {
      return
    }
  }

  undoList.insert(newState)
}

const cloneState = (originalState) => {
  let newState = util.stringifyClone(originalState)
  // re-insert the reference to imageBitmap, which is a DOM element (canvas)
  if (originalState.imageBitmap) {
    newState.imageBitmap = originalState.imageBitmap
  }
  return newState
}

const undo = () => {
  undoList.undo()
  if (undoList.state.present) {
    let state = cloneState(undoList.state.present)
    module.exports.emit('undo', state)
  }
}

const redo = () => {
  undoList.redo()
  if (undoList.state.present) {
    let state = cloneState(undoList.state.present)
    module.exports.emit('redo', state)
  }
}

module.exports.addImageData = addImageData
module.exports.addSceneData = addSceneData
module.exports.undo = undo
module.exports.redo = redo
