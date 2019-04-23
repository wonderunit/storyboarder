import { EffectComposer, BloomEffect, RenderPass, EffectPass } from 'postprocessing'
import { WebGLRenderer, Scene, PerspectiveCamera, PointLight, SphereGeometry, MeshStandardMaterial, Mesh } from 'three'
import OrbitControls from './controls/OrbitControls'

// Get Redux Store
document.addEventListener('DOMContentLoaded', () => {
  const xhr = new XMLHttpRequest()

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      const { store } = JSON.parse(xhr.responseText)
      console.log(store)
    } else {
      console.log(xhr.responseText)
    }
  }

  xhr.open('GET', '/getStore')
  xhr.send()

  initPostProcessing()
  onResize()
  animate()
})

/* Custom settings */
const SETTINGS = {
  useComposer: false
}
let composer
let stats

/* Init renderer and canvas */
const container = document.body
const renderer = new WebGLRenderer()
container.style.overflow = 'hidden'
container.style.margin = 0
container.appendChild(renderer.domElement)
renderer.setClearColor(0x222222)

/* Main scene and camera */
const scene = new Scene()
const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
const controls = new OrbitControls(camera)
camera.position.z = 10
controls.enableDamping = true
controls.dampingFactor = 0.15
controls.start()

/* Lights */
const frontLight = new PointLight(0xffffaa, 1)
const backLight = new PointLight(0xaaffff, 1)
scene.add(frontLight)
scene.add(backLight)
frontLight.position.set(20, 20, 20)
backLight.position.set(-20, -20, 20)

/* Various event listeners */
window.addEventListener('resize', onResize)

/* Actual content of the scene */
const geometry = new SphereGeometry(2, 32, 32)
const material = new MeshStandardMaterial({ roughness: 0.75 })
const sphere = new Mesh(geometry, material)
scene.add(sphere)

/* some stuff with gui */
if (DEVELOPMENT) {
  const guigui = require('guigui')
  guigui.add(SETTINGS, 'useComposer')

  const Stats = require('stats.js')
  stats = new Stats()
  stats.showPanel(0)
  container.appendChild(stats.domElement)
  stats.domElement.style.position = 'absolute'
  stats.domElement.style.top = 0
  stats.domElement.style.left = 0
}

/* -------------------------------------------------------------------------------- */
function initPostProcessing() {
  composer = new EffectComposer(renderer)
  const bloomEffect = new BloomEffect()
  const effectPass = new EffectPass(camera, bloomEffect)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)
  composer.addPass(effectPass)
  effectPass.renderToScreen = true
}

/**
  Resize canvas
*/
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
}

/**
  RAF
*/
function animate() {
  window.requestAnimationFrame(animate)
  render()
}

/**
  Render loop
*/
function render() {
  if (DEVELOPMENT) {
    stats.begin()
  }

  controls.update()
  if (SETTINGS.useComposer) {
    composer.render()
  } else {
    renderer.clear()
    renderer.render(scene, camera)
  }

  if (DEVELOPMENT) {
    stats.end()
  }
}
