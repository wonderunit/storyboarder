
import * as THREE from 'three'

import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'

const loadingManager = new THREE.LoadingManager()
const exrLoader = new EXRLoader(loadingManager)
//THREE.Cache.enabled = true

export { exrLoader }