

import * as THREE from 'three'

import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'

const loadingManager = new THREE.LoadingManager()
const stlLoader = new STLLoader(loadingManager)
//THREE.Cache.enabled = true

export { stlLoader }
