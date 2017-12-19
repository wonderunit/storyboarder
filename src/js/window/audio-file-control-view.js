// TODO profile `render` performance (especially when not recording)
// TODO split recording feature into its own component?
//
class AudioFileControlView {
  constructor ({ onRequestFile, onSelectFile, onSelectFileCancel, onClear, onToggleRecord }) {
    this.state = {
      boardAudio: undefined,
      isRecording: false
    }

    this.onRequestFile = onRequestFile.bind(this)
    this.onSelectFile = onSelectFile.bind(this)
    this.onSelectFileCancel = onSelectFileCancel.bind(this)
    this.onClear = onClear.bind(this)
    this.onToggleRecord = onToggleRecord.bind(this)

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
  }

  setState (state) {
    this.state = state
    this.render()
  }

  startRecording ({ boardAudio }) {
    this.setState({
      boardAudio,
      isRecording: true
    })
  }

  stopRecording ({ boardAudio }) {
    this.setState({
      boardAudio,
      isRecording: false
    })
  }

  render () {
    const { boardAudio, isRecording } = this.state

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
      recordButton.querySelector('.record_icon span').innerHTML = 'S'

      context.clearRect(0, 0, context.canvas.width, context.canvas.height)
      context.fillStyle = '#f00'

      context.beginPath()
      context.arc(0, 0, 5, 0, Math.PI * 2)
      context.closePath()
      context.fill()

      context.beginPath()
      context.arc(context.canvas.width, 0, 5, 0, Math.PI * 2)
      context.closePath()
      context.fill()

      context.beginPath()
      context.arc(context.canvas.width, context.canvas.height, 5, 0, Math.PI * 2)
      context.closePath()
      context.fill()

      context.beginPath()
      context.arc(0, context.canvas.height, 5, 0, Math.PI * 2)
      context.closePath()
      context.fill()

      return
    }



    audiofileButton.style.display = 'block'
    audiofileClearBtnEl.style.display = 'block'
    recordingContainerEl.style.width = 'auto'

    recordVisualization.style.display = 'none'
    recordButton.querySelector('.record_icon span').innerHTML = 'R'
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

module.exports = AudioFileControlView
