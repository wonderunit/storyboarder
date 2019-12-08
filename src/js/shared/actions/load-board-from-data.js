const { ActionCreators } = require('redux-undo')

const {
  setBoard,
  loadScene,
  resetScene,
} = require('../reducers/shot-generator')

const loadBoardFromData = (board, dispatch) => {
  let shot = board.sg

  dispatch(setBoard(board))

  if (shot) {
    dispatch(loadScene(shot.data))
  } else {
    dispatch(resetScene())
  }

  dispatch(ActionCreators.clearHistory())
}

module.exports = loadBoardFromData
