class AudioFileControlView {
  constructor ({ onRequestFile, onSelectFile, onSelectFileCancel, onClear, onToggleRecord, onAudioComplete }) {
    this.state = {
      boardAudio: undefined,
      mode: 'initializing', // initializing, stopped, countdown, recording, finalizing
      counter: undefined,

      lastAudioData: undefined,
      lastMeter: undefined
    }

    this.onRequestFile = onRequestFile.bind(this)
    this.onSelectFile = onSelectFile.bind(this)
    this.onSelectFileCancel = onSelectFileCancel.bind(this)
    this.onClear = onClear.bind(this)
    this.onToggleRecord = onToggleRecord.bind(this)
    this.onAudioCompleteCallback = onAudioComplete.bind(this)

    this.el = document.querySelector('.audiofile_container')

    this.el.querySelector('.audiofile_button').addEventListener('click', this.onRequestFile)
    this.el.querySelector('.audiofile_clear').addEventListener('click', this.onClear)

    this.el.querySelector('.record_button').addEventListener('click', this.onToggleRecord)

    // add resize observer
    let recordVisualization = this.el.querySelector('.record_visualization')
    let context = recordVisualization.querySelector('canvas').getContext('2d')
    let ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === recordVisualization) {
          // re-size
          context.canvas.width = entry.contentRect.width
          context.canvas.height = entry.contentRect.height
          // trigger a re-render
          this.setState(this.state)
        }
      }
    })
    ro.observe(recordVisualization)

    this.countdown = undefined

    this.setState(this.state) // render

    this.recorder = new Recorder()
    this.recorder.initialize().then(() => {
      this.setState({ mode: 'stopped' })
    })
  }

  setState (newState) {
    this.state = Object.assign(this.state, newState)
    this.render()
  }

  startCountdown ({ onComplete }) {
    if (this.state.mode === 'countdown' || this.countdown) return

    this.countdown = new Countdown()
    this.countdown.start({
      onComplete: onComplete.bind(this),
      onTick: ({ counter }) => this.setState({ counter, mode: 'countdown' })
    })

    this.recorder.monitor({
      onAudioData: ({ lastAudioData, lastMeter }) => {
        this.setState({ lastAudioData, lastMeter })
      }
    })
  }

  startRecording ({ boardAudio }) {
    if (this.countdown) {
      this.countdown.dispose()
      this.countdown = undefined
    }

    this.recorder.start({
      onAudioData: ({ lastAudioData, lastMeter }) => {
        this.setState({ lastAudioData, lastMeter })
      },
      onAudioComplete: (buffer) => {
        console.log('AudioFileControlView#onAudioComplete')
        this.setState({ mode: 'stopped', lastAudioData: undefined, lastMeter: undefined })
        this.onAudioCompleteCallback(buffer)
      }
    })

    this.setState({
      boardAudio,
      mode: 'recording'
    })
  }

  isCountingDownOrRecording () {
    return this.state.mode === 'countdown' ||
           this.state.mode === 'recording'
  }

  stopRecording ({ boardAudio }) {
    console.log('AudioFileControlView#stopRecording', 'isCountingDownOrRecording?', this.isCountingDownOrRecording())
    if (!this.isCountingDownOrRecording()) return

    this.recorder.stop()

    this.setState({
      boardAudio,
      mode: 'finalizing'
    })
  }

  render () {
    const { boardAudio, lastAudioData, lastMeter } = this.state

    let audiofileTextEl = this.el.querySelector('.audiofile_text')
    let audiofileInputEl = this.el.querySelector('input#audiofile')
    let audiofileSvgUseEl = this.el.querySelector('svg use')
    let audiofileClearBtnEl = this.el.querySelector('.audiofile_clear')
    let audiofileButton = this.el.querySelector('.audiofile_button')

    let recordingContainerEl = this.el.querySelector('.recording_container')
    let recordButton = this.el.querySelector('.record_button')
    let recordVisualization = this.el.querySelector('.record_visualization')
    let context = recordVisualization.querySelector('canvas').getContext('2d')

    if (this.isCountingDownOrRecording()) {
      audiofileButton.style.display = 'none'
      audiofileClearBtnEl.style.display = 'none'
      recordingContainerEl.style.width = '100%'

      recordVisualization.style.display = 'flex'

      if (this.state.mode === 'countdown') {
        // countdown
        recordButton.querySelector('.record_icon span').innerHTML = this.state.counter
      }

      if (this.state.mode === 'recording') {
        // stop icon
        recordButton.querySelector('.record_icon span').innerHTML =
          `<div style="width: 12px; height: 12px; background-color: red">&nbsp;</div>`
      }

      context.clearRect(0, 0, context.canvas.width, context.canvas.height)
      if (lastAudioData) {
        // drawBuffer(context.canvas.width, context.canvas.height, context, lastAudioData)
        drawWaveform(
          context,
          this.state.mode === 'countdown'
            ? 'silver'
            : '#699EF2',
          lastAudioData
        )
      }
      if (lastMeter) {
        drawMeter(
          context,
          this.state.mode === 'countdown'
            ? 'silver'
            : '#699EF2',
          Tone.dbToGain(lastMeter) // scale to 0…1
        )
      }

      // FOR DEBUGGING draw registration marks
      //
      // context.fillStyle = '#f00'
      // context.beginPath()
      // context.arc(0, 0, 5, 0, Math.PI * 2)
      // context.closePath()
      // context.fill()
      // 
      // context.beginPath()
      // context.arc(context.canvas.width, 0, 5, 0, Math.PI * 2)
      // context.closePath()
      // context.fill()
      // 
      // context.beginPath()
      // context.arc(context.canvas.width, context.canvas.height, 5, 0, Math.PI * 2)
      // context.closePath()
      // context.fill()
      // 
      // context.beginPath()
      // context.arc(0, context.canvas.height, 5, 0, Math.PI * 2)
      // context.closePath()
      // context.fill()

      return
    }

    if (this.state.mode === 'finalizing') {
      console.log('finalizing ...')
      return
    }


    audiofileButton.style.display = 'block'
    audiofileClearBtnEl.style.display = 'block'
    recordingContainerEl.style.width = 'auto'

    recordVisualization.style.display = 'none'
    // record icon
    recordButton.querySelector('.record_icon span').innerHTML = `
      <div style="width: 12px; height: 12px; background-color: red; border-radius: 12px;">&nbsp;</div>
    `
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)

    if (boardAudio) {
      // on
      audiofileInputEl.value = boardAudio.filename

      // audiofileTextEl.innerHTML = util.truncateMiddle(boardAudio.filename)
      audiofileTextEl.innerHTML = '<span>' +
                                    // '<span class="paren">(</span>' + 
                                    'Audio' + // : 3s 44.1khz 16bit
                                    // '<span class="paren">)</span>' +
                                  '</span>'

      audiofileSvgUseEl.setAttribute('xlink:href',
        audiofileSvgUseEl.getAttribute('xlink:href')
          .split('#')[0] + '#icon-speaker-on')

      audiofileClearBtnEl.style.opacity = 1.0
      audiofileClearBtnEl.style.pointerEvents = 'auto'
    } else {
      // mute
      audiofileInputEl.value = ''
      audiofileTextEl.innerHTML = '<span class="muted">' +
                                    // '<span class="paren">(</span>' + 
                                    'Select Audio File' +
                                    // '<span class="paren">)</span>' +
                                  '</span>'
      audiofileSvgUseEl.setAttribute('xlink:href',
        audiofileSvgUseEl.getAttribute('xlink:href')
          .split('#')[0] + '#icon-speaker-off')

      audiofileClearBtnEl.style.opacity = 0.5
      audiofileClearBtnEl.style.pointerEvents = 'none'
    }
  }
}

const Tone = require('tone')

// states: initializing, stopped, recording, finalizing
class Recorder {
  async initialize () {
    this.userMedia = new Tone.UserMedia()
    this.analyser = new Tone.Analyser({ type: 'waveform', size: 1024 })
    this.meter = new Tone.Meter()

    this.monitorInterval = undefined
    this.isFinalizing = false

    await this.userMedia.open()

    this.userMedia.connect(this.analyser)
    this.userMedia.connect(this.meter)

    this.mediaRecorder = new MediaRecorder(
      this.userMedia._mediaStream.mediaStream,
      {
        mimeType: 'audio/webm;codec=opus'
      }
    )
  }

  monitor ({ onAudioData }) {
    this.monitorInterval = setInterval(() => {
      console.log('monitor', 'onAudioData:', onAudioData)
      onAudioData({
        lastAudioData: this.analyser.getValue(),
        lastMeter: this.meter.getLevel()
      })
    }, 1000 / 15) // 15 fps monitor
  }

  // start (assumes .monitor has already been called)
  start ({ onAudioData, onAudioComplete }) {
    console.log('Recorder#start')

    if (this.monitorInterval) clearInterval(this.monitorInterval)

    this.mediaRecorder.start({
      timeslice: 1000
    })

    this.onAudioDataCallback = onAudioData.bind(this)
    this.onAudioCompleteCallback = onAudioComplete.bind(this)

    this.chunks = []
    this.isFinalizing = false

    this.mediaRecorder.ondataavailable = this.onAudioData.bind(this)
  }

  stop () {
    if (this.mediaRecorder.state != 'recording') return

    console.log('Recorder#stop', 'mediaRecorder.state:', this.mediaRecorder.state)
    this.onAudioDataCallback = undefined

    this.mediaRecorder.stop()

    this.isFinalizing = true
  }

  onAudioData (event) {
    console.log('Recorder#onAudioData')
    this.chunks.push(event.data)
    if (this.onAudioDataCallback) {
      this.onAudioDataCallback({
        lastAudioData: this.analyser.getValue(),
        lastMeter: this.meter.getLevel()
      })
    }

    if (this.isFinalizing) {
      this.isFinalizing = false
      this.mediaRecorder.ondataavailable = undefined
      this.onAudioComplete()
    }
  }

  onAudioComplete () {
    console.log('AudioRecorder#onAudioComplete')

    if (!this.chunks.length) {
      this.onAudioCompleteCallback(null)
      return
    }

    let blob = new Blob(this.chunks, { 'type': 'audio/webm;codec=opus' })
    let reader = new FileReader()
    reader.onload = () => {
      let buffer = new Buffer(reader.result)
      this.onAudioCompleteCallback(buffer)
      this.chunks = []
    }
    reader.readAsArrayBuffer(blob)
  }
}

// via https://webaudiodemos.appspot.com/AudioRecorder/js/audiodisplay.js
const drawBuffer = (width, height, context, data) => {
  let step = Math.ceil(data.length / width / 2) // TODO why do we need to / 2 to fit?
  let amp = height / 2
  context.fillStyle = 'silver'
  context.clearRect(0, 0, width, height)
  for (let i = 0; i < width; i++) {
    let min = 1.0
    let max = -1.0
    for (j = 0; j < step; j++) {
      let datum = data[(i*step)+j]

      if (datum < min)
          min = datum
      if (datum > max)
          max = datum
    }
    context.fillRect(
      i,
      (1 + min) * amp,
      1,
      Math.max(1, (max - min) * amp)
    )
  }
}

// via https://github.com/Tonejs/Tone.js/blob/3ea44d3af63d365243f853b97738e3d1c15c0822/examples/analysis.html#L93
const drawWaveform = (context, color = '#699EF2', data) => {
	// let waveformGradient = context.createLinearGradient(
  //   0, 0, context.canvas.width, context.canvas.height)
	// waveformGradient.addColorStop(0, '#ddd')
	// waveformGradient.addColorStop(1, '#000')

	context.clearRect(
    0, 0, context.canvas.width, context.canvas.height)
	context.beginPath()
	context.lineJoin = 'round'
	context.lineWidth = 1.5
	context.strokeStyle = color // waveformGradient
	context.moveTo(0, 0.5 * context.canvas.height)
	for (var i = 1, len = data.length; i < len; i++) {
		var val = (data[i] + 1) / 2
		var x = context.canvas.width * (i / len)
		var y = val * context.canvas.height
		context.lineTo(x, y)
	}
	context.stroke()
}

const drawMeter = (context, color = '#699EF2', value) => {
  context.fillStyle = color
  context.beginPath()
  context.fillRect(
    0,
    context.canvas.height - 2,
    context.canvas.width * value,
    2
  )
  context.closePath()
  context.fill()
}

class Countdown {
  constructor () {
    console.log('new Countdown')
    this.counter = 0
    this.timer = undefined

    this.onCompleteCallback = undefined
    this.onTickCallback = undefined

    this._onTick = this._onTick.bind(this)
  }

  start ({ onComplete, onTick }) {
    console.log('Countdown#start', { onComplete, onTick })

    this.onCompleteCallback = onComplete
    this.onTickCallback = onTick

    this.counter = 3
    clearTimeout(this.timer)
    this._onTick()
  }

  _onTick () {
    console.log('Countdown#_onTick', this.onTickCallback)
    if (this._isComplete()) {
      this._onComplete()
    } else {
      this.timer = setTimeout(this._onTick, 1000)
      this.onTickCallback({ counter: Number(this.counter) }) // send a copy
      this.counter = this.counter - 1
    }
  }

  _onComplete () {
    this.onCompleteCallback()
  }

  _isComplete () {
    return this.counter === 0
  }

  dispose () {
    clearTimeout(this.timer)
  }
}

module.exports = AudioFileControlView
