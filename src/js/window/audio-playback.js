const Tone = require('tone')

class AudioPlayback {
  constructor ({ store, sceneData, getAudioFilePath }) {
    console.log('new AudioPlayback')

    this.store = store
    this.sceneData = sceneData
    this.getAudioFilePath = getAudioFilePath

    this.buffers = new Tone.Buffers()
    this.currentBoard = 0
    this.hasLoaded = false
    this.players = new Tone.Players()

    this.resetBuffers()

    this.onBuffersLoaded = this.onBuffersLoaded.bind(this)
  }

  resetBuffers () {
    this.buffers = new Tone.Buffers()
  }

  // TODO main-window should call updateBuffers whenever board order or audio data changes
  updateBuffers () {
    console.log('AudioPlayback#updateBuffers')

    for (let board of this.sceneData.boards) {
      if (!board.audio) return

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
    console.log('AudioPlayback#playBoard', index)
    
    this.currentBoard = index
    
    let board = this.sceneData.boards[this.currentBoard]
    console.log('\taudio:', board.audio)

    if (board.audio) {
      this.players.get(board.audio.filename).start()

      // TODO play any overlapping buffers at correct offset
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
  }

  stop () {
    console.log('AudioPlayback#stop')
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
