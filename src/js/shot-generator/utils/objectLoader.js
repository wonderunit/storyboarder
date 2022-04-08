import * as THREE from 'three'


const loadingManager = new THREE.LoadingManager()
const objectLoader = new THREE.ObjectLoader(loadingManager)
//THREE.Cache.enabled = true

export { objectLoader }
