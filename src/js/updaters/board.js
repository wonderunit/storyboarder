const util = require('../utils/index.js')

let assignUid = board => {
  board.uid = util.uidGen(5)
  return board
}

let setup = board => {
  board.layers = board.layers || {} // TODO is this necessary?

  // set some basic data for the new board
  board.newShot = board.newShot || false
  board.lastEdited = Date.now()

  return board
}

let updateUrlsFromIndex = (board, index) => {
  board.url = 'board-' + (index + 1) + '-' + board.uid + '.png'

  if (board.layers.reference) {
    board.layers.reference.url = board.url.replace('.png', '-reference.png')
  }

  if (board.layers.notes) {
    board.layers.notes.url = board.url.replace('.png', '-notes.png')
  }

  return board
}

module.exports = {
  assignUid,
  setup,
  updateUrlsFromIndex
}