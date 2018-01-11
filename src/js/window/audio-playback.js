const Tone = require('tone')

const AppMenu = require('../menu')

// i love my curvy modified tone player.
// as a teenager i was often teased by my friends
// for my attraction to audio envelopes on the `exponential` side,
// curves that the average (basic) bro might refer to as
// not `linear` (the default shape)
require('../vendor/ext/tone-player-with-curve.js')

class AudioPlayback {
  constructor ({ store, sceneData, getAudioFilePath }) {
    this.store = store
    this.sceneData = sceneData
    this.getAudioFilePath = getAudioFilePath

    this.players = undefined

    this.isPlaying = false

    this.isBypassed = false
    this.enableAudition = false

    this._storedState = {}

    this.resetBuffers()
  }

  setBypassed (value) {
    this.isBypassed = value
  }

  setEnableAudition (value) {
    this.enableAudition = value

    // HACK we're controlling the menu directly here
    //      a cleaner solution would be to ask the menu to make the change,
    //      listen for the change,
    //      and then update the view state in response
    AppMenu.setEnableAudition(value)
  }

  toggleAudition () {
    this.setEnableAudition(!this.enableAudition)
  }
  pushState () {
    this._storedState = {
      enableAudition: this.enableAudition
    }
  }
  popState () {
    this.setEnableAudition(this._storedState.enableAudition)
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

    // should we prevent auditioning?
    if (isAuditioning && !this.enableAudition) return

    const MSECS_IN_A_SECOND = 1000
    // related: ffmpeg.js afade
    const FADE_OUT_IN_SECONDS = 0.35

    // unused. this literally cuts at the exact point.
    // const CUT_EARLY_IN_SECONDS = 0.5

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

        // is this the currently playing board?
        if (board === playingBoard) {
          // console.log('\tplaying current board', board.audio.filename, this.players.get(board.audio.filename))

          // let durationInSeconds = Math.max(0, player.buffer.duration - CUT_EARLY_IN_SECONDS)

          player.fadeOut = FADE_OUT_IN_SECONDS
          player.curve = 'exponential'

          // TODO
          // If audio is already playing, .stop is called on the player by Tone. But,
          // for some reason, this causes a warning:
          // "Time is in the past. Scheduled time must be >= AudioContext.currentTime"
          // Couldn't figure out how to prevent that. Seems to be harmless? :/
          player.start(
            // start now
            Tone.Time(),
            // no offset
            0
            // duration, cut early
            // durationInSeconds
          )

        // does this board end AFTER this current playing board starts?
        } else if (
          // it started before
          board.time < playingBoard.time &&
          // ... but it ends after
          ((board.time + (player.buffer.duration * MSECS_IN_A_SECOND)) > playingBoard.time) &&
          // ... and we're NOT in auditioning mode
          //   (i.e.: we don't want to play overlapping audio from prior boards
          //    when we're auditioning a single board)
          !isAuditioning
        ) {
          // console.log('\tfound overlapping board, i')
          if (board.audio) {
            let offsetInMsecs = playingBoard.time - board.time
            // console.log('\tplaying overlapping', board.audio.filename, 'at offset', offsetInMsecs)
            let player = this.players.get(board.audio.filename)
            if (player.state !== 'started') {
              // let durationInSeconds = Math.max(0, (player.buffer.duration - (offsetInMsecs / MSECS_IN_A_SECOND) - CUT_EARLY_IN_SECONDS))
              player.fadeOut = FADE_OUT_IN_SECONDS
              player.curve = 'exponential'
              player.start(
                // start now
                Tone.Time(),

                // offset by offsetInMsecs (converted to seconds)
                offsetInMsecs / MSECS_IN_A_SECOND

                // duration, cut early
                // durationInSeconds
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
