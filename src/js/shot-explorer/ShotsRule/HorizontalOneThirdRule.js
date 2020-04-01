import ShotRule from './ShotRule'
class HorizontalOneThirdRule extends ShotRule {
    constructor(focusedCenter, camera) {
        super(focusedCenter, camera)
    }

    applyRule(centerOfView) {
        super.applyRule()
        let center = this.focusedCenter;
        
        let vFOV = THREE.Math.degToRad( this.camera.fov ); // convert vertical fov to radians
        let height = 2 * Math.tan( vFOV / 2 ) * this.camera.position.distanceTo(centerOfView); // visible height
        let y = height * ( 2/3 );
        let desiredPos = new THREE.Vector3(centerOfView.x, y, center.z);
        let minHeight = height / 2 - centerOfView.y;
        desiredPos.y -= minHeight;

        let hypotenus = desiredPos.distanceTo(this.camera.position);
        let opposite = desiredPos.distanceTo(center);
        let angle = opposite / hypotenus;
        angle = desiredPos.y > center.y ? -angle : angle;
        this.cameraRotation = angle;

        let rot = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ")
        let rotation = rot.y
        let roll = rot.z
        let tilt = rot.x

        console.log("rotation", rotation)
        console.log("roll", roll)
        console.log("this.camera.rotation.x", this.camera.rotation.x)
        console.log("tilt", tilt)
        console.log("angle", angle)
        this.camera.rotation.x = 0
        this.camera.rotation.z = 0
        this.camera.rotation.y = rotation 
        angle += tilt
        this.camera.rotateX(angle)
        this.camera.rotateZ(roll)
        this.camera.updateMatrixWorld(true);
    }
}

export default HorizontalOneThirdRule
