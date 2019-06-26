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
        this.domElement = domElement;
        this.isControlPointSelected = false;
        this.isControlTargetSelected = false;
        TargetControl.selectedControl = null;
        this.control.addEventListener("pointerDown", (event) => console.log("pointerdown"));
        this.isRotationLocked = false;
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
        movingTarget.position.copy(position);
        movingTarget.renderOrder = 1;
        movingTarget.pointerDown = () => {movingTarget.dispatchEvent( { type: 'pointerdown', message: '' } );};
        scene.add(movingTarget);
        movingTarget.userData.type = "controlPoint";
        movingTarget.name = "controlPoint";
        movingTarget.scope = this;
        this.control.scope = this;
        movingTarget.addEventListener("pointerdown", this.controlPointSelection);
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
        this.target.addEventListener("pointerdown", this.controlPointSelection);
    }

    removeFromScene()
    {
        let scene = this.scene;
        scene.remove(this.target);
        scene.remove(this.control);
        this.control.dispose();
        this.isControlTargetSelected = false;
        this.isControlPointSelected = false;
        this.target.removeEventListener("pointerdown", this.controlPointSelection);
        this.removeEventsFromControlTarget();
    }

    deselectControlPoint()
    {
        let scene = this.scene;
        this.isControlPointSelected = false;
        scene.remove(this.control);
        this.control.dispose();
        this.removeEventsFromControlTarget();
    }

    addEventsToControlTarget()
    {
        let control = this.control;
        control.addEventListener("pointerdown", this.selecteControlTarget);
        control.addEventListener("pointerup", this.deselectcontrolTarget);
        this.domElement.addEventListener("keydown", this.onKeyDownLockRotation, );
    }

    removeEventsFromControlTarget()
    {
        let control = this.control;
        control.removeEventListener("pointerdown", this.selecteControlTarget);
        control.removeEventListener("pointerup", this.deselectcontrolTarget);
        this.domElement.removeEventListener("keydown", this.onKeyDownLockRotation);
    }
    
    selecteControlTarget(event)
    {
        this.scope.isControlTargetSelected = true;
    }

    deselectcontrolTarget(event)
    {
        this.scope.isControlTargetSelected = false;
    }

    controlPointSelection(event)
    {
        let scope = this.scope;
        if(!scope.isControlSelected)
        {
            let scope = this.scope;
            let selectedMesh = TargetControl.selectedControl;
            if(selectedMesh && selectedMesh !== scope)
            {
                selectedMesh.deselectControlPoint();
            }
            TargetControl.selectedControl = scope;
            scope.isControlPointSelected = true;
            scope.scene.add(scope.control);
            scope.control.addToScene();
            scope.addEventsToControlTarget();
        }
    }

    onKeyDownLockRotation(event)
    {
        if(event.ctrlKey)
        {
            if(event.key === 'e')
            {
                event.stopPropagation();
                TargetControl.selectedControl.isRotationLocked = !TargetControl.selectedControl.isRotationLocked;
            }
        }
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
