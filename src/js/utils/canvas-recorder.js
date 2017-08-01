const path = require('path')

const CanvasBufferOutputFileStrategy = require('../utils/canvas-buffer-ouput-file.js')
const CanvasBufferOutputGifStrategy = require('../utils/canvas-buffer-ouput-gif.js')
const CanvasBuffer = require('../utils/canvas-buffer.js')

class Recorder {
  constructor(options = {}) {
    this.screenRecordingFrameNum = 0
    this.isRecording = false
    this.dropFrameCount = options.dropFrameCount || 0

    let recordingStrategy
    switch(options.recordingStrategy) {
      case "RecordingStrategyTimeRatio":
        recordingStrategy = new RecordingStrategyTimeRatio(options)
        break
      case "RecordingStrategyFrameRatio":
      default:
        recordingStrategy = new RecordingStrategyFrameRatio(options)
        break
    }
    this.recordingStrategy = recordingStrategy

    let outputStrategy
    this.exportsPath = options.exportsPath
    switch(options.outputStrategy) {
      case "CanvasBufferOutputGifStrategy":
        let filepath = path.join(options.exportsPath, `recording.gif`)
        outputStrategy = new CanvasBufferOutputGifStrategy({filepath: filepath, width: 400, height: 225})
        break
      case "CanvasBufferOutputFileStrategy":
      default:
        outputStrategy = new CanvasBufferOutputFileStrategy()
        break
    }
    this.screenRecordingBuffer = this.screenRecordingBuffer = new CanvasBuffer({outputStrategy})
  }

  start() {
    this.isRecording = true
  }

  capture(snapshotCanvas, options={force:false}) {
    if(!this.isRecording && !options.force) {
      return
    }
    // logic for dropping or combining frames.
    if(!this.recordingStrategy.isFrameRecorded() && !options.force) {
      return
    }

    let filepath = path.join(this.exportsPath, `recording-${this.screenRecordingFrameNum++}.png`)
    this.screenRecordingBuffer.addToBuffer(snapshotCanvas, filepath)
  }

  stop() {
    this.screenRecordingBuffer.flushBuffer()
    this.isRecording = false
  }
}

class RecordingStrategyTimeRatio {
  constructor(options) {
    this.recordingTime = options.recordingTime || 10
    this.outputTime = options.outputTime || 1
    this.timeAllowance = (this.recordingTime / this.outputTime)*1000
  }

  isFrameRecorded() {
    let now = Date.now()

    if(!this.lastRecordingTime) {
      this.lastRecordingTime = now
      return true
    }

    console.log(`${now} - ${this.lastRecordingTime} > ${this.timeAllowance}`)
    let isPass = now - this.lastRecordingTime > this.timeAllowance
    if(isPass) this.lastRecordingTime = now
    return isPass
  }
}

class RecordingStrategyFrameRatio {
  constructor(options) {
    this.screenRecordingFrameNum = 0
    this.dropFrameCount = options.dropFrameCount || 0
  }

  isFrameRecorded() {
    return this.screenRecordingFrameNum++ % this.dropFrameCount === 0
  }
}

module.exports = Recorder