class AudioFileControlView {
  constructor ({ onRequestFile, onSelectFile, onSelectFileCancel, onClear }) {
    this.onRequestFile = onRequestFile.bind(this)
    this.onSelectFile = onSelectFile.bind(this)
    this.onSelectFileCancel = onSelectFileCancel.bind(this)
    this.onClear = onClear.bind(this)

    this.el = document.querySelector('.audiofile_container')

    this.el.querySelector('.audiofile_button').addEventListener('click', this.onRequestFile)
    this.el.querySelector('.audiofile_clear').addEventListener('click', this.onClear)
  }
  render ({ boardAudio }) {
    let audiofileTextEl = this.el.querySelector('.audiofile_text')
    let audiofileInputEl = this.el.querySelector('input#audiofile')
    let audiofileSvgUseEl = this.el.querySelector('svg use')
    let audiofileClearBtnEl = this.el.querySelector('.audiofile_clear')

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
