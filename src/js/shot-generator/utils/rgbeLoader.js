
import * as THREE from 'three'

import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'

const loadingManager = new THREE.LoadingManager()
const rgbeLoader = new RGBELoader(loadingManager)
//THREE.Cache.enabled = true

export { rgbeLoader }