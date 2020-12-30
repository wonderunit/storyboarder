import * as THREE from 'three'

import {OutlineEffect} from '../../vendor/OutlineEffect'

const IMAGE_WIDTH = 68
const IMAGE_HEIGHT = 100

class ThumbnailRenderer {
  constructor (renderParameters) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.createElement('canvas'),
      antialias: true
    })
    this.renderer.setClearColor( 0x3e4043, 1 )

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      // fov
      75,
      // aspect ratio
      IMAGE_WIDTH/IMAGE_HEIGHT,

      // near
      0.01,

      // far
      1000
    )

    let light = new THREE.AmbientLight(0xffffff, 0.3)
    this.scene.add(light)

    this.group = new THREE.Group()
    this.scene.add(this.group)

    let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.7)

    this.scene.add(directionalLight)
    directionalLight.position.set(0, 5, 3)
    directionalLight.rotation.z = Math.PI/6.0
    directionalLight.rotation.y = Math.PI/6.0
    directionalLight.rotation.x = Math.PI/6.0


    this.camera.position.y = 1
    this.camera.position.z = 2
    this.scene.add(this.camera)

    this.outlineEffect = new OutlineEffect(
      this.renderer,
      {
        defaultThickness: 0.018, // 0.008, 0.009
        ignoreMaterial: false,
        defaultColor: [0, 0, 0],
        ...renderParameters
      }
    )
  }

  clear () {}

  render () {
    this.renderer.setSize(IMAGE_WIDTH*2, IMAGE_HEIGHT*2)
    this.outlineEffect.render(this.scene, this.camera)
  }

  toDataURL (...args) {
    return this.renderer.domElement.toDataURL(...args)
  }

  toBase64 (...args) {
    return this.toDataURL(...args).replace(/^data:image\/\w+;base64,/, '')
  }

  getGroup () {
    return this.group
  }

  getCamera () {
    return this.camera
  }

  dispose () {
    this.renderer.dispose()
  }
}

export default ThumbnailRenderer
