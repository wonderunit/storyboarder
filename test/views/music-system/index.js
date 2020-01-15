// npx parcel serve test/views/music-system/index.html src/data/shot-generator/xr/snd/** -d test/views/music-system/dist
// open http://localhost:1234/test/views/music-system/index.html

import * as Tone from 'tone'
import * as THREE from 'three'
import * as musicSystem from '../../../src/js/xr/src/music-system'

window.onclick = function () {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  scene.add(camera)

  const listener = new THREE.AudioListener()
  camera.add(listener)

  new THREE.AudioLoader().load('/src/data/shot-generator/xr/snd/vr-drone.ogg', buffer => {
    const audio = new THREE.PositionalAudio(listener)
    audio.setBuffer(buffer)
    audio.setLoop(true)
    audio.setVolume(0.3)
    audio.play()

    // attach the music system
    let { sampler } = musicSystem.init({
      urlMap: {
        'C4': '/src/data/shot-generator/xr/snd/vr-instrument-c4.ogg',
        'C5': '/src/data/shot-generator/xr/snd/vr-instrument-c5.ogg',
        'C6': '/src/data/shot-generator/xr/snd/vr-instrument-c6.ogg'
      },
      audioContext: audio.context,
      audioNode: audio,
      onComplete: () => {
        // musicSystem.start()

        console.log('<br/>click again to play a sequence')
        window.onclick = function () {
          musicSystem.setIsPlaying(true)
          musicSystem.playSequence()
        }
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
