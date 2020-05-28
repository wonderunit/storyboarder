import * as THREE from 'three'

const s = new THREE.Vector3(0, 0, -1)
const clampInstance = (instance, camera, dir = s ) => {
    let box = new THREE.Box3().setFromObject(instance)
    let sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    let h = sphere.radius / Math.tan( camera.fov / 2 * Math.PI / 180 )
    camera.position.addVectors( sphere.center, dir.setLength(h))
    camera.lookAt(sphere.center)
    camera.updateMatrixWorld(true)
}
export default clampInstance
