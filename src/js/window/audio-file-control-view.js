class AudioFileControlView {
  constructor ({ onRequestFile, onSelectFile, onSelectFileCancel }) {
    this.onRequestFile = onRequestFile.bind(this)
    this.onSelectFile = onSelectFile.bind(this)
    this.onSelectFileCancel = onSelectFileCancel.bind(this)

    this.el = document.querySelector('.audiofile_container')

    this.el.addEventListener('click', this.onRequestFile)
  }
  render ({ boardAudio }) {
    let audiofileTextEl = this.el.querySelector('.audiofile_text')
    let audiofileInputEl = this.el.querySelector('input#audiofile')
    let audiofileSvgUseEl = this.el.querySelector('svg use')

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
    }
  }
}

module.exports = AudioFileControlView
