import * as THREE from 'three'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

const loadingManager = new THREE.LoadingManager()
const gltfLoader = new GLTFLoader(loadingManager)
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./js/vendor/draco/')
gltfLoader.setDRACOLoader( dracoLoader )
//THREE.Cache.enabled = true

export { gltfLoader }