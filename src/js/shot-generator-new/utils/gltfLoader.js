const  THREE = require('three')
window.THREE = THREE

require('../../vendor/three/examples/js/loaders/GLTFLoader')
require('../../vendor/three/examples/js/loaders/OBJLoader2')
const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
objLoader.setLogging(false, false)
THREE.Cache.enabled = true

export { gltfLoader }