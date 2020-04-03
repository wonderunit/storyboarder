import ShotRule from './ShotRule'
import rotateAroundPoint from '../utils/rotateAroundPoint';
class VerticalOneThirdRule extends ShotRule {
    constructor(focusedCenter, camera, side = "right") {
        super(focusedCenter, camera);
        this.side = side;
    }

    applyRule(centerOfView) {
        super.applyRule();
        let center = this.focusedCenter; 
        let vFOV = THREE.Math.degToRad( this.camera.fov ); // convert vertical fov to radians
        let height = 2 * Math.tan( vFOV / 2 ) * centerOfView.distanceTo(this.camera.position); // visible height
        let width = height * this.camera.aspect;  
        let x = width * ( 2/3 );
        let desiredPos = new THREE.Vector3(x, centerOfView.y, centerOfView.z);
        let minWidth = centerOfView.x - width / 2 ;
        desiredPos.x += minWidth;

        let BA = new THREE.Vector3().subVectors(center, this.camera.position)
        let BC = new THREE.Vector3().subVectors(desiredPos, this.camera.position)
        let cosineAngle = BA.dot(BC) / (BA.length() * BC.length());
        let angle = Math.acos(cosineAngle);
        angle = this.side === "right" ? angle : -angle;
        this.cameraRotation = angle
  
        this.camera.rotateY(angle)
        this.camera.updateMatrixWorld(true);
    }
}

export default VerticalOneThirdRule