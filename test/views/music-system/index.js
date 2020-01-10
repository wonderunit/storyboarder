// npx parcel serve test/views/music-system/index.html src/data/shot-generator/xr/snd/** -d test/views/music-system/dist
// open http://localhost:1234/test/views/music-system/index.html

import * as Tone from 'tone'
import * as THREE from 'three'
import * as musicSystem from '../../../src/js/xr/src/music-system.js'

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
        'C4': '/src/data/shot-generator/xr/snd/vr-instrument-c4.mp3',
        'C5': '/src/data/shot-generator/xr/snd/vr-instrument-c5.mp3',
        'C6': '/src/data/shot-generator/xr/snd/vr-instrument-c6.mp3'
      },
      audioContext: audio.context,
      audioNode: audio
    })
  })
}
