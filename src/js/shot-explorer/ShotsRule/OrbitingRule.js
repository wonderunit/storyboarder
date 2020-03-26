import ShotRule from "./ShotRule"
const rotateAroundPoint = (obj, point, axis, theta, pointIsWorld) => {
    pointIsWorld = (pointIsWorld === undefined)? false : pointIsWorld;

    if(pointIsWorld){
        obj.parent.localToWorld(obj.position); // compensate for world coordinate
    }

    obj.position.sub(point); // remove the offset
    obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
    obj.position.add(point); // re-add the offset

    if(pointIsWorld){
        obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
    }

    obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}

class OrbitingRule extends ShotRule {
    constructor(focusedCenter, camera, angle) {
        super(focusedCenter, camera);
        this.angle = angle;
    }

    applyRule() {
        super.applyRule();
        let object = new THREE.Object3D()
        object.add(this.camera)
        rotateAroundPoint(this.camera.parent, this.focusedCenter, new THREE.Vector3(0, 1, 0), this.angle, false)
        this.camera.parent.updateMatrixWorld(true)
        this.camera.applyMatrix(this.camera.parent.matrixWorld)
        this.camera.parent.remove(this.camera)
        this.camera.updateMatrixWorld(true)
    }
}

export default OrbitingRule;
