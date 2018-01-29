const { boardDuration } = require('./board')

const sceneDuration = scene => {
  // when does the last listed board end?
  let lastBoard = scene.boards[scene.boards.length - 1]
  let boardsEndInMsecs = lastBoard.time + boardDuration(scene, lastBoard)

  // for all boards ...
  let audioEndsInMsecsSorted = scene.boards
    // ... with audio
    .filter(board => board.audio !== undefined)
    // ... when does the audio end?
    .map(board => board.time + board.audio.duration)
    // ... sort numerically high to low
    .sort((a, b) => b - a)

  let audioEndInMsecs = audioEndsInMsecsSorted.length
    ? audioEndsInMsecsSorted[0]
    : -1

  return Math.max(boardsEndInMsecs, audioEndInMsecs)
}

module.exports = {
  sceneDuration
}
