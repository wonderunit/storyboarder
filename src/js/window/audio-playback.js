class AudioPlayback {
  constructor () {
    console.log('new AudioPlayback')
  }

  loadBuffers () {
    console.log('AudioPlayback#loadBuffers')
  }

  playBoard (index) {
    console.log('AudioPlayback#playBoard', index)
  }

  start () {
    console.log('AudioPlayback#start')
  }

  stop () {
    console.log('AudioPlayback#stop')
  }

  dispose () {
    console.log('AudioPlayback#dispose')
  }
}

module.exports = AudioPlayback
