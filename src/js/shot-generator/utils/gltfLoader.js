import * as THREE from 'three'

import('../../vendor/three/examples/js/loaders/GLTFLoader')

const loadingManager = new THREE.LoadingManager()
const gltfLoader = new THREE.GLTFLoader(loadingManager)
//THREE.Cache.enabled = true

export { gltfLoader }