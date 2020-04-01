import ShotRule from './ShotRule'
class VerticalOneThirdRule extends ShotRule {
    constructor(focusedCenter, camera, side = "right") {
        super(focusedCenter, camera);
        this.side = side;
    }

    applyRule() {
        super.applyRule();
        let center = this.focusedCenter; 
        let vFOV = THREE.Math.degToRad( this.camera.fov ); // convert vertical fov to radians
        let height = 2 * Math.tan( vFOV / 2 ) * this.camera.position.distanceTo(center); // visible height
        let width = height * this.camera.aspect;  
        let x = width * ( 2/3 );
        let desiredPos = new THREE.Vector3(x, center.y, center.z);
        let minWidth = width / 2 - center.x;
        desiredPos.x -= minWidth;
        let hypotenus = desiredPos.distanceTo(this.camera.position);
        let opposite = desiredPos.distanceTo(center);
        let angle = opposite / hypotenus;
        this.cameraRotation = this.side === "right" ? angle : -angle;

        
        this.camera.rotateY(this.side === "right" ? angle : -angle);
        this.camera.updateMatrixWorld(true);
    }
}

export default VerticalOneThirdRule