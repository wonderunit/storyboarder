// TODO profile `render` performance (especially when not recording)
// TODO split recording feature into its own component?
// TODO performance of recorder -- maybe dispose when not in use?
class AudioFileControlView {
  constructor ({ onRequestFile, onSelectFile, onSelectFileCancel, onClear, onToggleRecord, onAudioComplete }) {
    this.state = {
      boardAudio: undefined,
      isRecording: false
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

    this.setState(this.state)

    this.recorder = new Recorder()
    this.recorder.initialize() // async
  }

  setState (newState) {
    this.state = Object.assign(this.state, newState)
    this.render()
  }

  startRecording ({ boardAudio }) {
    this.recorder.start({
      onAudioData: ({ lastAudioData, lastMeter }) => {
        this.setState({ lastAudioData, lastMeter })
      },
      onAudioComplete: (buffer) => {
        console.log('AudioFileControlView#onAudioComplete')
        this.onAudioCompleteCallback(buffer)
      }
    })
    this.setState({
      boardAudio,
      isRecording: true
    })
  }

  stopRecording ({ boardAudio }) {
    this.recorder.stop()
    this.setState({
      boardAudio,
      isRecording: false
    })
  }

  render () {
    const { boardAudio, isRecording, lastAudioData, lastMeter } = this.state

    let audiofileTextEl = this.el.querySelector('.audiofile_text')
    let audiofileInputEl = this.el.querySelector('input#audiofile')
    let audiofileSvgUseEl = this.el.querySelector('svg use')
    let audiofileClearBtnEl = this.el.querySelector('.audiofile_clear')
    let audiofileButton = this.el.querySelector('.audiofile_button')

    let recordingContainerEl = this.el.querySelector('.recording_container')
    let recordButton = this.el.querySelector('.record_button')
    let recordVisualization = this.el.querySelector('.record_visualization')
    let context = recordVisualization.querySelector('canvas').getContext('2d')

    if (isRecording) {
      audiofileButton.style.display = 'none'
      audiofileClearBtnEl.style.display = 'none'
      recordingContainerEl.style.width = '100%'

      recordVisualization.style.display = 'flex'
      // stop icon
      recordButton.querySelector('.record_icon span').innerHTML = `
        <div style="width: 12px; height: 12px; background-color: red">&nbsp;</div>
      `

      context.clearRect(0, 0, context.canvas.width, context.canvas.height)

      if (lastAudioData) {
        // drawBuffer(context.canvas.width, context.canvas.height, context, lastAudioData)
        drawWaveform(context, lastAudioData)
      }

      if (lastMeter) {
        drawMeter(
          context,
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

    this.lastMeter = 0

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

  start ({ onAudioData, onAudioComplete }) {
    console.log('Recorder#start')

    if (this.mediaRecorder.state === 'recording') return

    this.onAudioDataCallback = onAudioData.bind(this)
    this.onAudioCompleteCallback = onAudioComplete.bind(this)

    this.chunks = []

    this.mediaRecorder.start({
      timeslice: 1000
    })

    this.isFinalizing = false

    this.mediaRecorder.ondataavailable = this.onAudioData.bind(this)
  }

  stop () {
    console.log('Recorder#stop')
    this.onAudioDataCallback = undefined

    this.mediaRecorder.stop()
    // TODO do we get more onAudioData after `stop` called?

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
      this.onAudioComplete()
    }
  }

  onAudioComplete () {
    console.log('AudioRecorder#onAudioComplete')

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
const drawWaveform = (context, data) => {
	// let waveformGradient = context.createLinearGradient(
  //   0, 0, context.canvas.width, context.canvas.height)
	// waveformGradient.addColorStop(0, '#ddd')
	// waveformGradient.addColorStop(1, '#000')

	context.clearRect(
    0, 0, context.canvas.width, context.canvas.height)
	context.beginPath()
	context.lineJoin = 'round'
	context.lineWidth = 1.5
	context.strokeStyle = '#699EF2' // waveformGradient
	context.moveTo(0, 0.5 * context.canvas.height)
	for (var i = 1, len = data.length; i < len; i++) {
		var val = (data[i] + 1) / 2
		var x = context.canvas.width * (i / len)
		var y = val * context.canvas.height
		context.lineTo(x, y)
	}
	context.stroke()
}

const drawMeter = (context, value) => {
  context.fillStyle = '#699EF2'
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

module.exports = AudioFileControlView
