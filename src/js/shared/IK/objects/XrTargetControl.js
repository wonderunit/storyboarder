const { TransformControls } = require( "../../../../../shot-generator/IK/utils/TransformControls");
const THREE = require( "three");

// TargetControl is class which is resposible for TransformControl and Mesh
class XRTargetControl
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
        let material = new THREE.MeshBasicMaterial({ 
            color: 0x46428a,
            opacity: 0.4, 
            depthTest: false, 
            depthWrite: false,
            transparent: true,
            opacity: 1,
            flatShading: true });
        let geometry = new THREE.SphereGeometry(0.05);
        this.movingTarget = new THREE.Mesh(geometry, material);
    }

    //#region Events
    onKeyDown = event => this.onKeyDownLockRotation(event);
    onControlKeyDown = event => this.selectControlTarget();
    onControlKeyUp = event => this.deselectControlTarget();
    //#endregion

    initialize(position)
    {
        this.scene = scene;
        let movingTarget = this.movingTarget;
        movingTarget.position.copy(position);
        movingTarget.scale.set(0.4, 0.4, 0.4);
        movingTarget.renderOrder = 1;
        movingTarget.userData.type = "controlPoint";
        movingTarget.name = "controlPoint";
        movingTarget.scope = this;
        this.control.attach(movingTarget);
        this.target = movingTarget;

        movingTarget.layers.disable(0)
        movingTarget.layers.enable(1)
        movingTarget.layers.disable(2)
    }

    setBone(bone)
    {
        this.bone = bone;
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
    //#region Selection of control point
    selectControlPoint()
    {
        if(!this.isControlPointSelected && !this.bone.isRotated)
        {
            this.isControlPointSelected = true;
            this.scene.add(this.control);
            this.control.addToScene();
            this.addEventsToControlTarget();
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

    setCamera(camera)
    {
        this.control.changeCamera(camera);
        this.control.updateMatrixWorld();
    }
}
module.exports = XRTargetControl;
