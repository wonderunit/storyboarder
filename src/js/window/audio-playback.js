const Tone = require('tone')

class AudioPlayback {
  constructor ({ store, sceneData, getAudioFilePath }) {
    console.log('new AudioPlayback')

    this.store = store
    this.sceneData = sceneData
    this.getAudioFilePath = getAudioFilePath

    this.players

    this.isPlaying = false

    this.resetBuffers()
  }

  resetBuffers () {
    // reset existing players
    if (this.players) {
      this.players.stopAll()
      this.players.dispose()
    }

    this.players = new Tone.Players().toMaster()
  }

  updateBuffers () {
    console.log('AudioPlayback#updateBuffers')

    for (let board of this.sceneData.boards) {
      if (!board.audio) continue

      if (!this.players.has(board.audio.filename)) {
        console.log('\tloading', board.audio.filename)

        // TODO error handling
        // TODO loading status
        this.players.add(board.audio.filename, this.getAudioFilePath(board.audio.filename))
        // this.hasLoaded = this.buffers.loaded
      }
    }

    // TODO remove any buffers for files no longer referenced in scene boards
  }

  playBoard (index) {
    console.log('AudioPlayback#playBoard', index)

    if (!this.isPlaying) return

    const MSECS_IN_A_SECOND = 1000

    let playingBoard = this.sceneData.boards[index]

    for (let i = 0; i < this.sceneData.boards.length; i++) {
      let board = this.sceneData.boards[i]

      if (board.audio) {
        let player = this.players.get(board.audio.filename)

        if (!player.buffer.loaded) {
          console.error('audio not yet loaded', board.audio.filename)
          continue
        }

        console.log('found', board.audio.filename, 'with duration', player.buffer.duration, 'at', board.time)

        if (board === playingBoard) {
          console.log('\tplaying current board', board.audio.filename, this.players.get(board.audio.filename))

          this.players.get(board.audio.filename).start()

        // does this board end AFTER this current playing board starts?
        } else if (
          // it started before
          board.time < playingBoard.time &&
          // ... but it ends after
          ((board.time + (player.buffer.duration * MSECS_IN_A_SECOND)) > playingBoard.time)
        ) {
          console.log('\tfound overlapping board, i')
          if (board.audio) {
            let offsetInMsecs = playingBoard.time - board.time
            console.log('\tplaying overlapping', board.audio.filename, 'at offset', offsetInMsecs)
            let player = this.players.get(board.audio.filename)
            if (player.state !== 'started') {
              player.start(
                // start now
                Tone.Time(),

                // offset by offsetInMsecs (converted to seconds)
                offsetInMsecs / MSECS_IN_A_SECOND
              )
            }
          }
        }
      }
    }
  }

  start () {
    console.log('AudioPlayback#start')
    this.isPlaying = true
  }

  stop () {
    console.log('AudioPlayback#stop')

    this.isPlaying = false
    this.players.stopAll()
  }

  dispose () {
    console.log('AudioPlayback#dispose')
    this.players.stopAll()
    this.players.dispose()
  }
}

module.exports = AudioPlayback
