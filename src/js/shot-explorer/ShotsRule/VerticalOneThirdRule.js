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
        let desiredPos = new THREE.Vector3(centerOfView.x, y, centerOfView.z);
        let minHeight = height / 2 - centerOfView.y;
        desiredPos.y -= minHeight;

        let hypotenus = desiredPos.distanceTo(this.camera.position);
        let opposite = desiredPos.distanceTo(center);
        let angle = opposite / hypotenus;
        angle = desiredPos.y > center.y ? -angle : angle;
        this.cameraRotation = angle;
        this.camera.rotateX(angle);
        this.camera.updateMatrixWorld(true);
    }
}

export default HorizontalOneThirdRule