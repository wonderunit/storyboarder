class AudioFileControlView {
  constructor ({ onRequestFile, onSelectFile, onSelectFileCancel, onClear, onStartRecord, onStopRecord, onAudioComplete, onCounterTick, onNotify }) {
    this.state = {
      boardAudio: undefined,
      mode: 'initializing', // initializing, stopped, countdown, recording, finalizing, failed
      counter: undefined,

      lastAudioData: undefined,
      lastMeter: undefined
    }

    this.onRequestFile = onRequestFile.bind(this)
    this.onSelectFile = onSelectFile.bind(this)
    this.onSelectFileCancel = onSelectFileCancel.bind(this)
    this.onClear = onClear.bind(this)
    this.onNotify = onNotify.bind(this)

    this.onStartRecord = onStartRecord.bind(this)
    this.onStopRecord = onStopRecord.bind(this)

    this.onRecordMouseEvent = this.onRecordMouseEvent.bind(this)

    this.onAudioCompleteCallback = onAudioComplete.bind(this)
    this.onCounterTickCallback = onCounterTick.bind(this)

    this.el = document.querySelector('.audiofile_container')

    this.el.querySelector('.audiofile_button').addEventListener('click', this.onRequestFile)
    this.el.querySelector('.audiofile_clear').addEventListener('click', this.onClear)

    this.recordButtonEl = this.el.querySelector('.record_button')
    this.recordButtonEl.addEventListener('click', this.onRecordMouseEvent)

    // add resize observer
    let recordVisualization = this.el.querySelector('.record_visualization')
    let context = recordVisualization.querySelector('canvas').getContext('2d')
    let ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === recordVisualization) {
          // re-size

          // see: https://github.com/wonderunit/storyboarder/issues/1218
          context.canvas.width = entry.target.offsetWidth
          context.canvas.height = entry.target.offsetHeight

          // trigger a re-render
          this.setState(this.state)
        }
      }
    })
    ro.observe(recordVisualization)

    this.countdown = undefined

    this.setState(this.state) // render

    // skip right to `stopped`
    // if we need to record input, we'll go through the `initializing` state
    // via prepareToRecord
    this.setState({ mode: 'stopped' })
  }

  prepareToRecord () {
    return new Promise((resolve, reject) => {
      this.recorder = new Recorder()

      this.setState({ mode: 'initializing' })

      this.recorder.initialize().then(() => {
        this.setState({ mode: 'stopped' })
        resolve()

      }).catch(err => {
        // this.onNotify({ message: 'An error prevented the audio recorder from initializing' })
        // this.onNotify({ message: err.toString() })
        console.error(err)
        this.setState({ mode: 'failed' })
        reject(err)

      })
    })
  }

  onRecordMouseEvent (event) {
    if (this.state.mode === 'failed') {
      this.onNotify({ message: 'Sorry, there doesn’t seem to be a microphone or line input connected. To retry, connect a recording device to your computer and re-open this window.' })
    }

    // prevent during countdown and finalizing
    if (event.type === 'click' && this.state.mode === 'stopped') {
      this.recordButtonEl.removeEventListener('click', this.onRecordMouseEvent)
      this.recordButtonEl.addEventListener('pointerdown', this.onRecordMouseEvent)
      this.onStartRecord(event)
    }

    // prevent during countdown and finalizing
    if (event.type === 'pointerdown' && this.state.mode === 'recording') {
      this.recordButtonEl.removeEventListener('pointerdown', this.onRecordMouseEvent)
      this.onStopRecord(event)

      // wait for the next `click` ...
      this.recordButtonEl.addEventListener('click', () => {
        // ... then listen for clicks again
        this.recordButtonEl.addEventListener('click', this.onRecordMouseEvent)
      }, { once: true })
    }
  }

  setState (newState) {
    this.state = Object.assign(this.state, newState)
    this.render()
  }

  startCountdown ({ onComplete }) {
    if (this.state.mode === 'countdown' || this.countdown) return

    // the countdown task
    const countdown = () => {
      this.recorder.monitor({
        onAudioData: ({ lastAudioData, lastMeter }) => {
          this.setState({ lastAudioData, lastMeter })
        }
      })

      this.countdown = new Countdown()
      this.countdown.start({
        onComplete: onComplete.bind(this),
        onTick: ({ counter }) => {
          this.setState({ counter, mode: 'countdown' })
          this.onCounterTickCallback(counter)
        }
      })
    }

    // if recorder isn't ready yet
    if (!this.recorder) {
      // we gotta prepare it first
      this.prepareToRecord()
        // and then do the countdown task
        .then(countdown)
        .catch(err => console.error(err))
    } else {
      // we can just do the countdown task
      countdown()
    }
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
        this.setState({ mode: 'stopped', lastAudioData: undefined, lastMeter: undefined })
        this.onAudioCompleteCallback(buffer)
      }
    })

    this.setState({
      boardAudio,
      mode: 'recording'
    })
  }

  isIdle () {
    return (
      this.state.mode === 'initializing' ||
      this.state.mode === 'stopped' ||
      this.state.mode === 'failed'
    )
  }

  isCountingDownOrRecording () {
    return this.state.mode === 'countdown' ||
           this.state.mode === 'recording'
  }

  stopRecording ({ boardAudio }) {
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
    let recordButton = this.recordButtonEl
    let recordVisualization = this.el.querySelector('.record_visualization')
    let context = recordVisualization.querySelector('canvas').getContext('2d')

    this.el.className = `audiofile_container audiofile_container--${this.state.mode}`

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
          `<div class="record_icon_stop">&nbsp;</div>`
      }

      context.clearRect(0, 0, context.canvas.width, context.canvas.height)
      if (lastAudioData) {
        // drawBuffer(context.canvas.width, context.canvas.height, context, lastAudioData)
        drawWaveform(
          context,
          this.state.mode === 'countdown'
            ? 'silver'
            : '#8d89cf',
          lastAudioData
        )
      }
      if (lastMeter) {
        drawMeter(
          context,
          this.state.mode === 'countdown'
            ? 'silver'
            : '#8d89cf',
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

    // if (this.state.mode === 'finalizing') {
    //   console.log('finalizing ...')
    //   return
    // }

    if (this.state.mode === 'failed') {
      recordButton.querySelector('.flatbutton').style.pointerEvents = 'none'
      recordButton.style.opacity = 0.5
      recordButton.style.cursor = 'not-allowed'
    }

    audiofileButton.style.display = 'block'
    audiofileClearBtnEl.style.display = 'block'
    recordingContainerEl.style.width = 'auto'

    recordVisualization.style.display = 'none'
    // record icon
    recordButton.querySelector('.record_icon span').innerHTML = `
      <div class="record_icon_record">&nbsp;</div>
    `
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)

    if (boardAudio) {
      // on
      audiofileInputEl.value = boardAudio.filename

      // audiofileTextEl.innerHTML = util.truncateMiddle(boardAudio.filename)
      audiofileTextEl.innerHTML = '<span>' +
                                    // '<span class="paren">(</span>' +
                                    `Audio: ${boardAudio.duration}ms` + // : 3s 44.1khz 16bit
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
const WavEncoder = require("wav-encoder")

// states: initializing, stopped, recording, finalizing
class Recorder {
  async initialize () {
    // FOR TROUBLESHOOTING AUDIO ISSUES
    // list out the audio devices to the console
    // throw a more helpful error if 'default' audio device cannot be found
    // NOTE inefficient, as `Tone.UserMedia.enumerateDevices` is also called again later by userMedia.open
    let devices = await Tone.UserMedia.enumerateDevices()
    console.log(`Tone.UserMedia found ${devices.length} audio devices:`)
    devices.forEach(d =>
      console.log(
        '-',
        `${d.label} [${d.deviceId.length && d.deviceId.slice(0, 7)}]`,
        'kind:', d.kind,
        'groupId:', (d.groupId.length && d.groupId.slice(0, 7)),
        d
      )
    )
    if (!devices.find(d => d.deviceId === 'default')) {
      throw new Error(
        'Could not find default audio device in the list of available devices:\n' +
        devices.map(d => `- ${d.label} [${d.deviceId.length && d.deviceId.slice(0, 7)}]`).join('\n'))
    }

    this.userMedia = new Tone.UserMedia()
    this.analyser = new Tone.Analyser({ type: 'waveform', size: 1024 })
    this.meter = new Tone.Meter()

    this.monitorInterval = undefined
    this.isFinalizing = false

    let result = await this.userMedia.open()
    console.log('userMedia.open:', result)

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
      onAudioData({
        lastAudioData: this.analyser.getValue(),
        lastMeter: this.meter.getLevel()
      })
    }, 1000 / 15) // 15 fps monitor
  }

  // start (assumes .monitor has already been called)
  start ({ onAudioData, onAudioComplete }) {
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
    this.onAudioDataCallback = undefined

    this.mediaRecorder.stop()

    this.isFinalizing = true
  }

  onAudioData (event) {
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
    if (!this.chunks.length) {
      this.onAudioCompleteCallback(null)
      return
    }

    let blob = new Blob(this.chunks, { 'type': 'audio/webm;codec=opus' })
    let reader = new FileReader()
    reader.onload = () => {
      Tone.context.decodeAudioData(
        reader.result,
        audioBuffer => {
          let sampleRate = audioBuffer.sampleRate
          let bitDepth = audioBuffer.bitDepth
          let channelData = []

          for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            channelData.push(audioBuffer.getChannelData(i))
          }

          let arrayBuffer = WavEncoder.encode.sync({
            sampleRate,
            channelData
          }, {
            bitDepth,
            float: false,
            symmetric: false // compatibility with Chrome
          })

          this.onAudioCompleteCallback(Buffer.from(arrayBuffer))
          this.chunks = []
        },
        err => {
          console.error('could not decode audio data', err)
          this.onAudioCompleteCallback(null)
          this.chunks = []
        }
      )

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
    for (let j = 0; j < step; j++) {
      let datum = data[(i * step) + j]

      if (datum < min) {
        min = datum
      }
      if (datum > max) {
        max = datum
      }
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
    this.tickDuration = 600

    this.counter = 0
    this.timer = undefined

    this.onCompleteCallback = undefined
    this.onTickCallback = undefined

    this._onTick = this._onTick.bind(this)
  }

  start ({ onComplete, onTick }) {
    this.onCompleteCallback = onComplete
    this.onTickCallback = onTick

    this.counter = 3
    clearTimeout(this.timer)
    this._onTick()
  }

  _onTick () {
    if (this._isComplete()) {
      this._onComplete()
    } else {
      this.timer = setTimeout(this._onTick, this.tickDuration)
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
