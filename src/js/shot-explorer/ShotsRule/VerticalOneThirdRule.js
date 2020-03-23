import ShotRule from './ShotRule'
class HorizontalOneThirdRule extends ShotRule {
    constructor(box, camera) {
        super(box, camera)
    }

    applyRule() {
        super.applyRule()
        let center = new THREE.Vector3()
        this.box.getCenter(center)
        let maxPosition =  this.box.max.clone().sub( this.box.min)
        let x = maxPosition.x * ( 2/3 ) 
        let y = maxPosition.y * ( 2/3)//( maxPosition.y / 3 +  ) / 2
        let z = maxPosition.z
        let desiredPos = new THREE.Vector3(x, y, z)
        desiredPos.add( this.box.min)
        desiredPos.x = center.x
        desiredPos.z = center.z
        let hypotenus = desiredPos.distanceTo(this.camera.position)
        let opposite = desiredPos.distanceTo(center)
        let angle = opposite / hypotenus
        this.cameraRotation = angle
        this.camera.rotateX(-angle)
        this.camera.updateMatrixWorld(true)
    }
}

export default HorizontalOneThirdRule