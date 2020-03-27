import * as THREE from 'three'
import ShotRule from './ShotRule'
import getRandomNumber from "../utils/getRandomNumber"
class RollRule extends ShotRule {
    constructor(focusedCenter, camera) {
        super(focusedCenter, camera);
        this.side = side;
    }

    applyRule() {
        super.applyRule();
        let randomAngle = getRandomNumber(30) + 5
        this.camera.rotateZ(randomAngle * THREE.Math.degToRad)
    }
}

export default RollRule