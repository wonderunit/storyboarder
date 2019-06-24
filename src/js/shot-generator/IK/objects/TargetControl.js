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
        this.isControlPointSelected = false;
        this.isControlTargetSelected = false;
        TargetControl.selectedControl = null;
        this.control.addEventListener("pointerDown", (event) => console.log("pointerdown"));
    }

    initialize(position, scene)
    {
        this.scene = scene;
        let material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            opacity: 0.4, 
            depthTest: false, 
            depthWrite: false,
            transparent: true,
            opacity: 1,
            flatShading: true });
        let geometry = new THREE.SphereGeometry(0.05);
        let movingTarget = new THREE.Mesh(geometry, material);
        movingTarget.position.z = position.z;
        movingTarget.position.y = position.y;
        movingTarget.position.x = position.x;
        movingTarget.renderOrder = 1;
        movingTarget.pointerDown = () => {movingTarget.dispatchEvent( { type: 'pointerdown', message: '' } );};
        scene.add(movingTarget);
        this.addEventsToControlTarget();
        movingTarget.userData.type = "controlPoint";
        movingTarget.name = "controlPoint";
        movingTarget.addEventListener("pointerdown", (event) => 
        {
            if(!this.isControlSelected)
            {
                let selectedMesh = TargetControl.selectedControl;
                if(selectedMesh)
                {
                    selectedMesh.deselectControlPoint();
                }
                TargetControl.selectedControl = this;
                this.isControlPointSelected = true;
                scene.add(this.control);
                this.control.addToScene();
            }
        });
        this.control.attach(movingTarget);
        this.target = movingTarget;
    }

    intializeWithMesh(mesh, scene)
    {
        this.scene = scene;
        this.control.attach(mesh);
        this.target = mesh;
    }

    addToScene()
    {
        let scene = this.scene;
        scene.add(this.target);
    }

    removeFromScene()
    {
        let scene = this.scene;
        scene.remove(this.target);
        scene.remove(this.control);
        this.control.dispose();
        this.isControlTargetSelected = false;
        this.isControlPointSelected = false;
    }

    deselectControlPoint()
    {
        console.log("Deselected");
        let scene = this.scene;
        this.isControlPointSelected = false;
        scene.remove(this.control);
        this.control.dispose();
    }

    addEventsToControlTarget()
    {
        let control = this.control;
        control.addEventListener("pointerdown", (event)=>
        {
            this.isControlTargetSelected = true;
        });
        control.addEventListener("pointerup", (event)=>
        {
            this.isControlTargetSelected = false;
        });
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
