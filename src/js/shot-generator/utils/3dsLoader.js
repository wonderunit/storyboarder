
import * as THREE from 'three'

import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader'

const loadingManager = new THREE.LoadingManager()
const tdsLoader = new TDSLoader(loadingManager)
//THREE.Cache.enabled = true

export { tdsLoader }
