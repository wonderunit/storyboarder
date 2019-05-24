const TransformControls = require( "../utils/TransformControls");
const THREE = require( "three");

class TargetControl
{
    constructor(camera, domElement, name)
    {
        this.control = new TransformControls( camera, domElement );
        this.control.size = 0.5;
        this.name = name;
        this.control.addEventListener('dragging-changed', ( event ) =>
        {
            //orbitControl.enabled = ! event.value;
        });
    }

    initialize(position, scene)
    {
        this.movingTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.4 }));
        this.movingTarget.position.z = position.z;
        this.movingTarget.position.y = position.y;
        this.movingTarget.position.x = position.x;
        scene.add(this.movingTarget);

        this.control.attach(this.movingTarget);
        scene.add(this.control);
        this.target = this.movingTarget;
    }

    intializeWithMesh(mesh, scene)
    {
        this.control.attach(mesh);
        scene.add(this.control);
        this.target = mesh;
    }
}
module.exports = TargetControl;
