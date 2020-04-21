const { TransformControls } = require( "../utils/TransformControls");

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
        this.bone = null;
    }

    //#region Events
    onKeyDown = event => this.onKeyDownLockRotation(event);
    onControlKeyDown = event => this.selectControlTarget();
    onControlKeyUp = event => this.deselectControlTarget();
    //#endregion

    initialize(scene, position, mesh)
    {
        this.scene = scene;
        let movingTarget = mesh;
        movingTarget.position.copy(position);
        movingTarget.scale.set(0.4, 0.4, 0.4);
        movingTarget.renderOrder = 9;
        movingTarget.scope = this;
        this.target = movingTarget;
    }

    setBone(bone)
    {
        this.bone = bone;
        this.control.attach(this.target);
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
    //#region Selection of control point
    selectControlPoint()
    {
        if(!this.isControlPointSelected && this.bone && !this.bone.isRotated)
        {
            this.isControlPointSelected = true;
            this.scene.add(this.control);
            
            this.control.addToScene();
            this.addEventsToControlTarget();
            if(this.target.userData.name === "Hips")
            {
                this.control.removePointerDownEvent();
            }
            this.domElement.focus();
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

    onKeyDownLockRotation(event)
    {
        if(event.ctrlKey )
        {
            if(event.key === 'e')
            {
                event.stopPropagation();
                this.isRotationLocked = !this.isRotationLocked;
                this.updateInitialPosition();
            }
        }
    }

    setCamera(camera)
    {
        this.control.changeCamera(camera);
        this.control.updateMatrixWorld();
    }
}
module.exports = TargetControl;
