import * as THREE from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const loadingManager = new THREE.LoadingManager()
const gltfLoader = new GLTFLoader(loadingManager)
//THREE.Cache.enabled = true

export { gltfLoader }