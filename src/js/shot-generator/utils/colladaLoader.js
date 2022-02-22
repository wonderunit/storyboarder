import * as THREE from 'three'

import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader'

const loadingManager = new THREE.LoadingManager()
const colladaLoader = new ColladaLoader(loadingManager)
//THREE.Cache.enabled = true

export { colladaLoader }
