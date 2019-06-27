const TransformControls = require( "../utils/TransformControls");
const THREE = require( "three");

// TargetControl is class which is resposible for TransformControl and Mesh
class TargetControl
{
    constructor(camera, domElement, name)
    {
        this.name = name;
        this.control = new TransformControls(camera, domElement);
        this.domElement = domElement;
        this.control.size = 0.2;
        this.isRotationLocked = false;
        this.control.userData.type = "controlTarget";
        this.isControlPointSelected = false;
        this.isControlTargetSelected = false;
    }

    //#region Events
    onKeyDown = event => this.onKeyDownLockRotation(event);
    onControlKeyDown = event => this.selectControlTarget();
    onControlKeyUp = event => this.deselectControlTarget();
    //#endregion

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
        scene.add(movingTarget);
        movingTarget.userData.type = "controlPoint";
        movingTarget.name = "controlPoint";
        movingTarget.scope = this;
        this.control.attach(movingTarget);
        this.target = movingTarget;
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
        this.deselectControlPoint();
    }

    addEventsToControlTarget()
    {
        let control = this.control;
        control.addEventListener("pointerdown", this.onControlKeyDown);
        control.addEventListener("pointerup", this.onControlKeyUp);
        this.domElement.addEventListener("keydown", this.onKeyDown, false );
    }

    removeEventsFromControlTarget()
    {
        let control = this.control;
        control.removeEventListener("pointerdown", this.onControlKeyDown);
        control.removeEventListener("pointerup", this.onControlKeyUp);
        this.domElement.removeEventListener("keydown", this.onKeyDown);
    }
    //#region Selectoin of control Target
    selectControlTarget()
    {
        this.isControlTargetSelected = true;
    }

    deselectControlTarget()
    {
        this.isControlTargetSelected = false;
    }
    //#endregion
    //#region selection of control point
    selectControlPoint()
    {
        if(!this.isControlPointSelected)
        {
            this.isControlPointSelected = true;
            this.scene.add(this.control);
            this.control.addToScene();
            this.addEventsToControlTarget();
        }
    }

    deselectControlPoint()
    {
        let scene = this.scene;
        this.isControlPointSelected = false;
        this.isControlTargetSelected = false;
        scene.remove(this.control);
        this.control.dispose();
        this.removeEventsFromControlTarget();
    }
    //#endregion
    // Locks rotation of current TargetControl
    onKeyDownLockRotation(event)
    {
        if(event.ctrlKey)
        {
            if(event.key === 'e')
            {
                event.stopPropagation();
                this.isRotationLocked = !this.isRotationLocked;
            }
        }
    }
}
module.exports = TargetControl;
