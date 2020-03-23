import ShotRule from './ShotRule'

class HorizontalOneThirdRule extends ShotRule {
    constructor(box, camera) {
        super(box, camera)
    }

    applyRule() {
        super.applyRule()
        let center = new THREE.Vector3()
        this.box.getCenter(center)
        let maxPosition =  this.box.max.clone().add( this.box.min)
        let x = maxPosition.x * ( 2/3 )
        let y = ( maxPosition.y / 3 + maxPosition.y * (2/3) ) / 2
        let z = maxPosition.z
        let desiredPos = new THREE.Vector3(x, y, z)
        desiredPos.sub( this.box.min)

        desiredPos.y = center.y
        let hypotenus = desiredPos.distanceTo(this.camera.position)
        let opposite = desiredPos.distanceTo(center)
        let angle = opposite / hypotenus
        this.cameraRotation = angle
        this.camera.rotateY(angle)
        this.camera.updateMatrixWorld(true)
    }
}

export default HorizontalOneThirdRule