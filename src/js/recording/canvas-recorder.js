const path = require('path')
const EventEmitter = require('events').EventEmitter
const CanvasBufferOutputFileStrategy = require('./canvas-buffer-ouput-file')
const CanvasBufferOutputGifStrategy = require('./canvas-buffer-ouput-gif')
const CanvasBuffer = require('./canvas-buffer')
const userDataHelper = require('../files/user-data-helper')

class Recorder extends EventEmitter {
  constructor(options = {}) {
    super()
    this.screenRecordingFrameNum = 0
    this.isRecording = false
    this.dropFrameCount = options.dropFrameCount || 0
    this.options = options
    this.options.filename = options.filename || `timelapse ${(new Date()).toString()}`
    this.options.filepath = options.filepath || path.join(options.exportsPath, options.filename + '.gif')
    this.initCanvasBuffer(options)
  }

  initCanvasBuffer(options) {
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

    let targetOutputWidth = this.options.outputWidth || 400
    let targetOutputHeight = this.options.outputHeight || 225

    let outputStrategy
    this.exportsPath = options.exportsPath
    switch(options.outputStrategy) {
      case "CanvasBufferOutputGifStrategy":
        outputStrategy = new CanvasBufferOutputGifStrategy({
          filepath: options.filepath,
          width: targetOutputWidth,
          height: targetOutputHeight,
          shouldWatermark: options.shouldWatermark,
          watermarkImagePath: options.watermarkImagePath
        })
        break
      case "CanvasBufferOutputFileStrategy":
      default:
        outputStrategy = new CanvasBufferOutputFileStrategy(options)
        break
    }
    this.screenRecordingBuffer = new CanvasBuffer({outputStrategy})
  }

  start() {
    this.isRecording = true
  }

  capture(snapshotCanvases, options={force:false}) {
    if(!this.isRecording && !options.force) {
      return
    }
    // logic for dropping or combining frames.
    if(!this.recordingStrategy.isFrameRecorded() && !options.force) {
      return
    }

    let frameNum = this.screenRecordingFrameNum++
    options.frameNum = frameNum
    this.screenRecordingBuffer.addToBuffer(snapshotCanvases, options)
  }

  stop() {
    this.screenRecordingBuffer.flushBuffer()
      .then((filepaths)=>{
        this.emit("recording-ready", filepaths)
      })
      .catch(error => {
        console.error(error)
      })
    this.isRecording = false

    userDataHelper.getData('recordings.json')
      .then(recordings => {
        recordings.unshift(this.options.filepath)
        userDataHelper.saveData('recordings.json', recordings)
          .then(()=>{})
          .catch(console.error)
      })
      .catch(error => {
        let recordings = [this.options.filepath]
        userDataHelper.saveData('recordings.json', recordings)
          .then(()=>{})
          .catch(console.error)
      })
  }
  
  cancel() {
    this.initCanvasBuffer(this.options)
    this.isRecording = false
  }
}

class RecordingStrategyTimeRatio {
  constructor(options) {
    // recording time is in minutes.
    this.recordingTime = options.recordingTime || 10
    this.timeAllowance = this.recordingTime * 60 * 4
  }

  isFrameRecorded() {
    let now = Date.now()

    if(!this.lastRecordingTime) {
      this.lastRecordingTime = now
      return true
    }

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
    if(this.dropFrameCount === 0) {
      this.screenRecordingFrameNum++
      return true
    }
    return this.screenRecordingFrameNum++ % this.dropFrameCount === 0
  }
}

module.exports = Recorder