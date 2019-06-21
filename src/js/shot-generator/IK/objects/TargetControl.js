const TransformControls = require( "../utils/TransformControls");
const THREE = require( "three");

class TargetControl
{

    constructor(camera, domElement, name)
    {
        this.control = new TransformControls(camera, domElement);
        this.control.size = 0.3;
        this.control.userData.type = "controlTarget";
        this.name = name;
        this.disabled = true;
    }

    initialize(position, scene)
    {
        let movingTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.4 }));
        movingTarget.position.z = position.z;
        movingTarget.position.y = position.y;
        movingTarget.position.x = position.x;

        movingTarget.userData.type = "controlTarget";
        scene.add(movingTarget);
        this.control.attach(movingTarget);
        scene.add(this.control);
        this.target = movingTarget;
    }

    intializeWithMesh(mesh, scene)
    {
        this.control.attach(mesh);
        scene.add(this.control);
        this.target = mesh;
    }

    addToScene(scene)
    {
        scene.add(this.target);
        scene.add(this.control);
    }

    removeFromScene(scene)
    {
        scene.remove(this.target);
        scene.remove(this.control);
    }

    set disable(isDisabled)
    {
        let visible = isDisabled ? false : true;
        this.target.visible = visible;
        this.control.visible = visible;
        this.disabled = isDisabled;
    }
}
module.exports = TargetControl;
