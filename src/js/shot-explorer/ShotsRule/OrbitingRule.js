import ShotRule from "./ShotRule"
import getRandomNumber from "../utils/getRandomNumber"
import rotateAroundPoint from "../utils/rotateAroundPoint"

const getOrbitingAngle = () => {
    let sidePercentage = getRandomNumber(100)
    let frontAndBackAngle = 110
    let sidesAngle = 70
    let angle 
    let frontChance = 40
    let leftChance = 25
    let rightChance = 25
    let backChance = 10
    // Front side
    if(sidePercentage < frontChance) {
        angle = getRandomNumber(frontAndBackAngle) - frontAndBackAngle / 2
    } else if(sidePercentage >= frontChance && sidePercentage < frontChance + leftChance) {
        angle = -getRandomNumber(sidesAngle) - frontAndBackAngle / 2
    } else if(sidePercentage >= frontChance + leftChance && sidePercentage < frontChance + leftChance + backChance) {
        angle = getRandomNumber(frontAndBackAngle) - frontAndBackAngle / 2
        angle = angle >= 0 ? 180 - angle : -(180 + angle)
    } else if(sidePercentage >= frontChance + leftChance + backChance && sidePercentage < frontChance + leftChance + backChance + rightChance) {
        angle = getRandomNumber(sidesAngle) + frontAndBackAngle / 2
    }
    return angle
}

class OrbitingRule extends ShotRule {
    constructor(focusedCenter, character, camera) {
        super(focusedCenter, camera);
        this.character = character
        this.angle = getOrbitingAngle() * THREE.Math.DEG2RAD + character.rotation.y;
    }

    applyRule() {
        super.applyRule();
        let object = new THREE.Object3D()
        object.add(this.camera)
        rotateAroundPoint(this.camera.parent, this.focusedCenter, new THREE.Vector3(0, 1, 0), this.angle, false)
        this.camera.parent.updateMatrixWorld(true)
        this.camera.applyMatrix4(this.camera.parent.matrixWorld)
        this.camera.parent.remove(this.camera)
        this.camera.updateMatrixWorld(true)
    }
}

export default OrbitingRule;
