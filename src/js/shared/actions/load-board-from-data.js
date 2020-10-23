const { ActionCreators } = require('redux-undo')

const {
  setBoard,
  loadScene,
  resetScene,
} = require('../reducers/shot-generator')

function loadBoardFromData (board) {
  return function (dispatch) {
    let shot = board.sg

    dispatch(setBoard(board))

    if (shot) {
      dispatch(loadScene(shot.data))
    } else {
      dispatch(resetScene())
    }

    dispatch(ActionCreators.clearHistory())
  }
}

module.exports = loadBoardFromData
