import ShotRule from './ShotRule'

class HorizontalOneThirdRule extends ShotRule {
    constructor(focusedCenter, camera, centerOfView) {
        super(focusedCenter, camera)
        this.centerOfView = centerOfView
    }

    applyRule() {
        super.applyRule()
        let center = this.focusedCenter;
        let centerOfView = this.centerOfView;
        let vFOV = THREE.Math.degToRad( this.camera.fov ); // convert vertical fov to radians
        let height = 2 * Math.tan( vFOV / 2 ) * centerOfView.distanceTo(this.camera.position); // visible height
        // takes 1 / 3 part of view
        let y = height * ( 2/3 );
        let desiredPos = new THREE.Vector3(centerOfView.x, y, centerOfView.z);
        let minHeight = centerOfView.y - height / 2;
        desiredPos.y += minHeight;

        // Calculates angle between two vectors
        let BA = new THREE.Vector3().subVectors(center, this.camera.position)
        let BC = new THREE.Vector3().subVectors(desiredPos, this.camera.position)
        let cosineAngle = BA.dot(BC) / (BA.length() * BC.length());
        let angle = Math.acos(cosineAngle);
        angle = desiredPos.y > center.y ? -angle : angle;
        this.cameraRotation = angle;
        this.camera.rotateX(angle);
        this.camera.updateMatrixWorld(true);
    }
}


export default HorizontalOneThirdRule
