
import * as THREE from 'three'

import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'

const loadingManager = new THREE.LoadingManager()
const mtlLoader = new MTLLoader(loadingManager)
//THREE.Cache.enabled = true

export { mtlLoader }
