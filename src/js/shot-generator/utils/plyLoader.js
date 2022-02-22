
import * as THREE from 'three'

import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'

const loadingManager = new THREE.LoadingManager()
const plyLoader = new PLYLoader(loadingManager)
//THREE.Cache.enabled = true

export { plyLoader }