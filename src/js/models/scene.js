const boardModel = require('./board')

const sceneDuration = scene =>
  scene.boards
    .map(board => board.time + boardModel.boardDurationWithAudio(scene, board))
    // ... sort numerically high to low
    .sort((a, b) => b - a)[0]

module.exports = {
  sceneDuration
}
