class ControlTargetSelection
{
    constructor(domElement, scene, camera, controlTargets)
    {
        this.ray = new THREE.Raycaster();
        this.rayControl = new THREE.Raycaster();
        this.camera = camera;
        this.scene = scene;
        this.domElement = domElement;
        this.controlTargets = controlTargets;
        this.meshes = controlTargets.map((controlTarget) => controlTarget.target);
        this.controls = controlTargets.map((controlTarget) => controlTarget.control);
        this.selectedMeshes = {};
    }

    initialize()
    {
        this.domElement.addEventListener("pointermove", this.onPointerMove, false);
    }

    // #region Events
    onPointerMove = (event) => { this.pointerHover(this.getPointer(event)); }
    //#endregion
    
    pointerHover( pointer ) 
    {
        let ray = this.ray;
        let selectedMeshes = this.selectedMeshes;
		ray.setFromCamera( pointer, this.camera );
        let intersectMeshes = ray.intersectObjects(this.meshes)[ 0 ] || false;
        let intersectControlTarget = false;
        if(Object.keys(selectedMeshes).length !== 0)
        {
            let rotationalGizmoHelpers = this.rotationalGizmoHelpers( Object.values(selectedMeshes)[0].scope.control);
            intersectControlTarget = ray.intersectObjects(rotationalGizmoHelpers)[ 0 ] || false;
        }
        
        if ( intersectMeshes ) 
        {
            let object = intersectMeshes.object;
            if(selectedMeshes[object.uuid] !== undefined)
            {
                return;
            }   
            selectedMeshes[object.uuid] = object;
            object.scope.selectControlPoint();
        } 
        else 
        {
            if(Object.keys(selectedMeshes).length === 0 || intersectControlTarget !== false)
            {
                return;
            }
            for(let keys in selectedMeshes)
            {
                let selectedMesh = selectedMeshes[keys];
                if(selectedMesh.scope.isControlTargetSelected)
                {
                    continue;
                }
                selectedMesh.scope.deselectControlPoint();
                delete selectedMeshes[keys];
            }
        }
    }

    getPointer( event ) 
    {
		let pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;
		let rect = this.domElement.getBoundingClientRect();
		return {
			x: ( pointer.clientX - rect.left ) / rect.width * 2 - 1,
			y: - ( pointer.clientY - rect.top ) / rect.height * 2 + 1,
			button: event.button
		};
    }
    
    rotationalGizmoHelpers(o)
    {
        let results = [];
        if(o.children.length !== 0)
        {
          let gizmo = o.children[0];
          let gizmoChildren = gizmo.children;
          for(let i = 0; i < gizmoChildren.length; i++)
          {
            if(gizmoChildren[i].name === "Helper")
            {
                let children = gizmoChildren[i].children;
                for (let i = 0; i < children.length; i++)
                {
                  results.push(children[i].clone());
                }
            }
          }
        }
        return results;
    }
    
    dispose()
    {
        this.domElement.removeEventListener("pointermove", this.onPointerMove, false);
    }
}

module.exports = ControlTargetSelection;
