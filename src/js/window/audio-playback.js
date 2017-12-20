const Tone = require('tone')

class AudioPlayback {
  constructor ({ store, sceneData, getAudioFilePath }) {
    this.store = store
    this.sceneData = sceneData
    this.getAudioFilePath = getAudioFilePath

    this.players

    this.isPlaying = false
    
    this.isBypassed = false

    this.resetBuffers()
  }

  setBypassed (value) {
    this.isBypassed = value
  }

  setSceneData (sceneData) {
    this.sceneData = sceneData
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
    return new Promise((resolve, reject) => {
      let loadables = []
      let failed = []
      let remaining = 0

      let onLoad = player => {
        // console.log('onLoad', player)
        remaining--
        checkDone()
      }

      let onError = event => {
        if (event instanceof ProgressEvent) {
          // find the associated player by comparing XHRs :/
          for (let filename of Object.keys(this.players._players)) {
            let player = this.players._players[filename]
            if (player.buffer._xhr === event.target) {
              failed.push(filename)
            }
          }
        }
        remaining--
        checkDone()
      }

      let checkDone = () => {
        if (remaining === 0) {
          Tone.Buffer.off('error', onError)
          resolve({ failed })
        }
      }
      Tone.Buffer.on('error', onError)

      for (let board of this.sceneData.boards) {
        if (!board.audio) continue

        if (!this.players.has(board.audio.filename)) {
          loadables.push(board.audio.filename)
        }
      }

      // remove any players for files no longer referenced in scene boards
      //
      // for every loaded audio file ...
      let sceneAudioFilenames = this.sceneData.boards.map(b => b.audio).map(a => a && a.filename).filter(a => !!a)
      for (let filename of Object.keys(this.players._players)) {
        // ... check to see if it's not referenced in the scene
        if (!sceneAudioFilenames.includes(filename)) {
          // remove the unused player
          console.log('removing unused player', filename)
          this.players._players[filename].dispose()
          delete this.players._players[filename]
        }
      }

      remaining = loadables.length

      if (remaining === 0) {
        resolve({ failed })
      } else {
        for (let filepath of loadables) {
          this.players.add(filepath, this.getAudioFilePath(filepath), onLoad)
        }
      }
    })
  }
  
  supportsType (url) {
    return Tone.Buffer.supportsType(url)
  }

  playBoard (index) {
    if (this.isBypassed) return

    // is the user auditioning audio by moving from board to board?
    let isAuditioning = !this.isPlaying

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

        // console.log('found', board.audio.filename, 'with duration', player.buffer.duration, 'at', board.time)

        if (board === playingBoard) {
          // console.log('\tplaying current board', board.audio.filename, this.players.get(board.audio.filename))

          this.players.get(board.audio.filename).start()

        // does this board end AFTER this current playing board starts?
        } else if (
          // it started before
          board.time < playingBoard.time &&
          // ... but it ends after
          ((board.time + (player.buffer.duration * MSECS_IN_A_SECOND)) > playingBoard.time)
          // ... and we're NOT in auditioning mode
          //   (i.e.: we don't want to play overlapping audio from prior boards
          //    when we're auditioning a single board)
          && !isAuditioning
        ) {
          // console.log('\tfound overlapping board, i')
          if (board.audio) {
            let offsetInMsecs = playingBoard.time - board.time
            // console.log('\tplaying overlapping', board.audio.filename, 'at offset', offsetInMsecs)
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
    this.isPlaying = true
  }

  stop () {
    this.isPlaying = false
    this.players.stopAll()
  }

  stopAllSounds () {
    this.players.stopAll()
  }

  dispose () {
    this.players.stopAll()
    this.players.dispose()
  }
}

module.exports = AudioPlayback
