class RagdollEvents
{
    constructor(ragdoll)
    {
        this.ragdoll = ragdoll;
    }
    //#region Events 
    onHipsControlMouseDown = event => {this.hipsControlMouseDown(event)};
    onHipsControlTransformMoved = event => {this.hipsControlTransformMoved(event)};
    onHipsControlDraggingChanged = event => {this.hipsControlDraggingChanged(event)};
    onHipsControlMouseUp = event => {this.hipsControlMouseUp(event)};

    onBackControlMouseDown = event => {this.backControlMouseDown(event)};
    onBackControlDraggingChanged = event => {this.backControlDraggingChanged(event)};
    onBackControlMouseUp = event => {this.backControlMouseUp(event)}; 
    
    onControlsMouseDown = event => {this.controlsMouseDown(event)};
    onControlsMouseUp = event => {this.controlsMouseUp(event)}; 

    //#endregion

    // Adds events to hips
    // Mainly is for controlling poleTarget position so it will follow hips
    // With taking offset between them into account
    addHipsEvent()
    {
        let hipsControl = this.ragdoll.hipsControlTarget.control;
        hipsControl.addEventListener("pointerdown", this.onHipsControlMouseDown, false);
        hipsControl.addEventListener("transformMoved", this.onHipsControlTransformMoved, false);
        hipsControl.addEventListener("dragging-changed", this.onHipsControlDraggingChanged, false);
        hipsControl.addEventListener("pointerup", this.onHipsControlMouseUp, false);
    }

    removeHipsEvent()
    {
        let hipsControl = this.ragdoll.hipsControlTarget.control;
 
        hipsControl.removeEventListener("pointerdown", this.onHipsControlMouseDown);
        hipsControl.removeEventListener("transformMoved", this.onHipsControlTransformMoved);
        hipsControl.removeEventListener("dragging-changed", this.onHipsControlDraggingChanged);
        hipsControl.removeEventListener("pointerup", this.onHipsControlMouseUp);
    }

    // Applies events to back control
    applyEventsToBackControl(backControl)
    {
        backControl.addEventListener("pointerdown", this.onBackControlMouseDown);
        backControl.addEventListener("dragging-changed", this.onBackControlDraggingChanged);
        backControl.addEventListener("pointerup", this.onBackControlMouseUp);
    }

    removeEventsFromBackControl()
    {
        let backControl = this.ragdoll.controlTargets[0].control;
        backControl.removeEventListener("pointerdown", this.onBackControlMouseDown);
        backControl.removeEventListener("dragging-changed", this.onBackControlDraggingChanged);
        backControl.removeEventListener("pointerup", this.onBackControlMouseUp);
    }

    // Sets up control event for mouse down and up to enable and disable ik on mouse click
    setUpControlsEvents()
    {
        let chainObject = this.ragdoll.chainObjects;
        for (let i = 0; i < chainObject.length; i++)
        {
            let control = chainObject[i].controlTarget.control;
            control.addEventListener("pointerdown", this.onControlsMouseDown);
            control.addEventListener("pointerup", this.onControlsMouseUp);
        }
    }

    removeControlsEvents()
    {
        let chainObject = this.ragdoll.chainObjects;
        for (let i = 0; i < chainObject.length; i++)
        {
            let control = chainObject[i].controlTarget.control;
            control.removeEventListener("pointerdown", this.onControlsMouseDown);
            control.removeEventListener("pointerup", this.onControlsMouseUp);
        }
    }

    //#region Events methods
    hipsControlMouseDown(event)
    {
        let ragdoll = this.ragdoll;
        ragdoll.hipsMouseDown = true;
        ragdoll.isEnabledIk = true;
        if(ragdoll.hipsControlTarget.control.mode === "rotate")
        {
            ragdoll.isEnabledIk = false;
            ragdoll.attached = true;
            ragdoll.originalObject.children[0].isRotated = true;
        }
    }

    hipsControlTransformMoved(event)
    {
        let ragdoll = this.ragdoll;
        if(ragdoll.hipsMouseDown)
        {
            //ragdoll.resetPoleTarget();
        }
    }

    hipsControlDraggingChanged(event)
    {
        let ragdoll = this.ragdoll;
        ragdoll.calculteBackOffset();
    }

    hipsControlMouseUp(event)
    {
        let ragdoll = this.ragdoll;
        if(ragdoll.attached)
        {
            ragdoll.attached = false;
            ragdoll.originalObject.children[0].isRotated = false;
        }
        ragdoll.applyingOffset = false;
        ragdoll.hipsMouseDown = false;
        ragdoll.isEnabledIk = false;
    }

    backControlMouseDown(event)
    {
        this.ragdoll.applyingOffset = true;
    }

    backControlDraggingChanged(event)
    {
        this.ragdoll.calculteBackOffset();
    }

    backControlMouseUp(event)
    {
        this.ragdoll.applyingOffset = false;
    }

    controlsMouseDown(event)
    {
        let control = event.target;
        this.ragdoll.isEnabledIk = true;
        control.activateTarget(true);
        if(control.mode === "rotate")
        {
            this.ragdoll.isRotation = true;
        }
    }

    controlsMouseUp(event)
    {
        let control = event.target;
        control.activateTarget(false);
        this.ragdoll.isRotation = false;
        this.ragdoll.isEnabledIk = false;
    }

    
    //#endregion
}
module.exports = RagdollEvents;
