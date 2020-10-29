// npx parcel serve test/views/music-system/index.html src/data/shot-generator/xr/snd/** -d test/views/music-system/dist
// open http://localhost:1234/test/views/music-system/index.html

const Tone = require('tone')
const THREE = require('three')
const musicSystem = require('../../../src/js/xr/src/music-system')

const React = require('react')
const ReactDOM = require('react-dom')

console.log = function (...rest) {
  document.getElementById('output').innerHTML += `${rest.join(',')}<br/>`
}

const preventDefault = (fn, ...args) => e => {
  e.preventDefault()
  fn(e, ...args)
}

let urlMap
async function loadFileAsAudioBuffer (audioContext, filename) {
  let response = await fetch(filename)
  let arrayBuffer = await response.arrayBuffer()
  return await new Promise(resolve => audioContext.decodeAudioData(arrayBuffer, resolve))
}
async function preload () {
  let audioContext = new AudioContext()
  urlMap = {
    'C4': await loadFileAsAudioBuffer(audioContext, '/src/data/shot-generator/xr/snd/vr-instrument-c4.ogg'),
    'C5': await loadFileAsAudioBuffer(audioContext, '/src/data/shot-generator/xr/snd/vr-instrument-c5.ogg'),
    'C6': await loadFileAsAudioBuffer(audioContext, '/src/data/shot-generator/xr/snd/vr-instrument-c6.ogg')
  }
}
preload()

window.onclick = function () {
  window.onclick = undefined

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  scene.add(camera)

  const listener = new THREE.AudioListener()
  camera.add(listener)

  new THREE.AudioLoader().load('/src/data/shot-generator/xr/snd/vr-drone.ogg', buffer => {
    const audio = new THREE.PositionalAudio(listener)
    audio.setBuffer(buffer)
    audio.setLoop(true)
    audio.setVolume(1)
    audio.play()

    // attach the music system
    let { sampler } = musicSystem.init({
      urlMap,
      audioContext: audio.context,
      audioNode: audio,
      onComplete: function () {
        musicSystem.setIsPlaying(true)

        let range = []
        for (let i = 0; i < musicSystem.getSequencesCount(); i++) {
          range.push(i)
        }

        function Output() {
          function onStartMusicSystemClick (event) {
            event.preventDefault()
            musicSystem.start()
          }
          function onPlayClick (n) {
            console.log('===')
            event.preventDefault()
            musicSystem.playSequence(n)
          }
          function onPlayRandomClick (event) {
            event.preventDefault()
            musicSystem.playSequence()
          }
          return <>
            <div>
              <a href="#" onClick={preventDefault(() => audio.stop())}>Stop Audio</a>
              <br />
              <a href="#" onClick={preventDefault(() => audio.play())}>Play Audio</a>
              <br />
            </div>
            <br />
            <div>
              <a href="#" onClick={onStartMusicSystemClick}>Start Music System</a>
              <br />
            </div>
            <br />
            <div>
              <a href="#" onClick={onPlayRandomClick}>Play Random</a>
              <br />
            </div>
            <br/>
            <b>Sequences by Index:</b>
            <div className="sequences" style={{ display: 'flex', flexWrap: 'wrap' }}>
              {range.map(function (n) {
                return <div key={n}>
                  <a href="#" onClick={() => onPlayClick(n)}>{n}</a>
                  <br />
                </div>
              })}
            </div>
          </>
        }

        ReactDOM.render(
          <Output />,
          document.getElementById('app')
        )
      }
    })

    // for MIDI testing
    function onMIDIMessage(event) {
      var str =
        'MIDI message received at timestamp ' +
        event.timeStamp +
        '[' +
        event.data.length +
        ' bytes]: '
      for (var i = 0; i < event.data.length; i++) {
        str += '0x' + event.data[i].toString(16) + ' '
      }
      // console.log(str)
      MIDIMessageEventHandler(event)
    }

    function noteOn(noteNumber) {
      console.log('noteOn', noteNumber)

      sampler.triggerAttackRelease(Tone.Frequency(noteNumber, 'midi'), '1n', '+0', 0.5)
    }

    function noteOff(noteNumber) {
      console.log('noteOff', noteNumber)
    }

    function MIDIMessageEventHandler(event) {
      // mask off the lower nibble (MIDI channel)
      switch (event.data[0] & 0xf0) {
        case 0x90:
          event.data[2] !== 0
            ? noteOn(event.data[1])
            : noteOff(event.data[1])
          break
        case 0x80:
          console.log('0x80')
          break
      }
    }

    navigator.requestMIDIAccess({ sysex: true }).then(function (access) {
      const inputs = access.inputs.values()

      for (var entry of access.inputs) {
        var input = entry[1]

        console.log(
          "Input port [type:'" +
          input.type +
          "'] id:'" +
          input.id +
          "' manufacturer:'" +
          input.manufacturer +
          "' name:'" +
          input.name +
          "' version:'" +
          input.version +
          "'"
        )

        entry[1].onmidimessage = onMIDIMessage

        console.log(entry)
      }

      access.onstatechange = function (e) {
        console.log(e.port.name, e.port.manufacturer, e.port.state)
      }
    })

  })
}
