

import * as THREE from 'three'

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

const loadingManager = new THREE.LoadingManager()
const fbxLoader = new FBXLoader(loadingManager)
//THREE.Cache.enabled = true

export { fbxLoader }
