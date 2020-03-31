import * as THREE from 'three'
import ShotRule from './ShotRule'
import getRandomNumber from "../utils/getRandomNumber"
class RollRule extends ShotRule {
    constructor(focusedCenter, camera) {
        super(focusedCenter, camera);
    }

    applyRule() {
        super.applyRule();
        let randomAngle = (getRandomNumber(30) + 5) * THREE.Math.DEG2RAD
        let rot = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ")
        let rotation = rot.y
        let tilt = rot.x

        this.camera.rotation.x = 0
        this.camera.rotation.z = 0
        this.camera.rotation.y = rotation
        this.camera.rotateX(tilt)
        this.camera.rotateZ(randomAngle)
    }
}

export default RollRule