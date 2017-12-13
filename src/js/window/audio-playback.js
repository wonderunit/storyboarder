const Tone = require('tone')

class AudioPlayback {
  constructor ({ store, sceneData, getAudioFilePath }) {
    console.log('new AudioPlayback')

    this.store = store
    this.sceneData = sceneData
    this.getAudioFilePath = getAudioFilePath

    this.buffers = new Tone.Buffers()
    this.hasLoaded = false
    this.players = new Tone.Players()

    this.resetBuffers()
    this.isPlaying = false

    this.onBuffersLoaded = this.onBuffersLoaded.bind(this)
  }

  resetBuffers () {
    this.buffers = new Tone.Buffers()
  }

  // TODO main-window should call updateBuffers whenever board order or audio data changes
  //          could key of board `time`??
  updateBuffers () {
    console.log('AudioPlayback#updateBuffers')

    for (let board of this.sceneData.boards) {
      if (!board.audio) continue

      if (!this.buffers.has(board.audio.filename)) {
        console.log('\tloading', board.audio.filename)
        this.buffers.add(board.audio.filename, this.getAudioFilePath(board.audio.filename), this.onBuffersLoaded)
        this.hasLoaded = this.buffers.loaded
      }
    }
  }

  onBuffersLoaded (event) {
    console.log('\tonBuffersLoaded', event)
    this.hasLoaded = this.buffers.loaded
  }

  playBoard (index) {
    let MSECS_IN_A_SECOND = 1000

    console.log('AudioPlayback#playBoard', index)

    if (!this.isPlaying) return

    let playingBoard = this.sceneData.boards[index]

    for (let i = 0; i < this.sceneData.boards.length; i++) {
      let board = this.sceneData.boards[i]

      if (board.audio) {
        let buffer = this.buffers.get(board.audio.filename)

        if (!buffer.loaded) {
          console.error('audio not yet loaded', board.audio.filename)
          continue
        }

        console.log('found', board.audio.filename, 'with duration', buffer.duration, 'at', board.time)

        if (board === playingBoard) {
            console.log('\tplaying current board')
            this.players.get(board.audio.filename).start()

        // does this board end AFTER this current playing board starts?
        } else if (
          // it started before
          board.time < playingBoard.time &&
          // ... but it ends after
          ((board.time + (buffer.duration * MSECS_IN_A_SECOND)) > playingBoard.time)
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
    if (this.players) {
      this.players.stopAll()
      this.players.dispose()
    }
    this.players = new Tone.Players().toMaster()

    for (let name in this.buffers._buffers) {
      console.log('adding a player for', name)
      this.players.add(name, this.buffers.get(name))
      console.log(this.players)
    }
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
    this.buffers.dispose()
  }
}

module.exports = AudioPlayback
