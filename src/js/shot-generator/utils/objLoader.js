import * as THREE from 'three'

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'

const loadingManager = new THREE.LoadingManager()
const objLoader = new OBJLoader(loadingManager)
//THREE.Cache.enabled = true

export { objLoader }
