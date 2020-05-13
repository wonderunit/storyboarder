const THREE = require("three")
require('./../../vendor/three-instanced-mesh')(THREE)
const RagDoll = require("./objects/IkObjects/Ragdoll")
require('./utils/Object3dExtension')
const TargetControl = require("./objects/TargetControl")
const ControlTargetSelection = require( "./objects/ControlTargetSelection")
let instance = null
class SGIKHelper extends THREE.Object3D
{
    constructor()
    {
        if(!instance)
        {
            super();
            instance = this;
        }
        return instance;
    }
    
    static getInstance() 
    {
        return instance ? instance : new SGIKHelper()
    }

    setUp(mesh, scene, camera, domElement) {
        this.controlPoints = new THREE.Group();
        this.selectedContolPoint = null;
        instance.ragDoll = new RagDoll();
        this.poleTargets = new THREE.Group();
        this.transformControls = new THREE.Group();
        this.targetControls = [];
        this.selectedControlPoint = null;
        this.intializedSkinnedMesh = null;
        this.isIkDisabled = false;
        for( var i = this.children.length - 1; i >= 0; i--) { 
            this.remove(this.children[i])
        }
        this.add(this.poleTargets);
        this.isPoleTargetsVisible = true;
        this.add(this.controlPoints);
        this.add(this.transformControls);
        //this.add(this.poleTargets);
        intializeInstancedMesh(mesh, camera, domElement, scene);
        this.add(this.instancedMesh);
        this.targetPoints = this.poleTargets.children.concat(this.controlPoints.children);
        this.regularHeight = 1.8;
        this.isInitialized = true;
        this.userData.type = "IkHelper";
        let controlTargetSelection = new ControlTargetSelection(domElement, camera, this.targetControls);
        this.ragDoll.controlTargetSelection = controlTargetSelection;
        this.isUpdating = false;
 
    }

    initialize(object, height, skinnedMesh, props)
    {
        let ragDoll = instance.ragDoll;
        if(this.characterObject) ragDoll.controlTargetSelection.initialize();
     
        this.characterObject = object;
        this.initPoleTarget(height, props)
        if(this.intializedSkinnedMesh && this.intializedSkinnedMesh.uuid === skinnedMesh.uuid) return;
        this.intializedSkinnedMesh = skinnedMesh;
        ragDoll.cleanUp();
        let endEffectors = this.targetControls.slice(0, this.controlPoints.children.length);
        let poleTargets = this.targetControls.slice(this.controlPoints.children.length);
        ragDoll.initObject(this, object, endEffectors, poleTargets);
        ragDoll.reinitialize();
        ragDoll.controlTargetSelection.initialize();
        this.updateAllTargetPoints();
    }

    initPoleTarget(height, props, forceUpdate = false)
    {
        if(!instance.ragDoll || !this.characterObject) return
        let meshes = this.targetPoints;
        let initializedMeshes = props.poleTargets ? props.poleTargets : [];
        let scaleAspect = height / this.regularHeight;
        let defaultScale = 0.1

        for(let i = 0; i < meshes.length; i++)
        {
            let mesh = meshes[i];
            let intializedMesh = initializedMeshes[mesh.name];
            mesh.userData.isInitialized = false;
            // Checks if there's already info for current mesh
            // Info like position
            mesh.scale.set(defaultScale, defaultScale, defaultScale).multiplyScalar(scaleAspect);
            if(intializedMesh)
            {
                let pos = intializedMesh.position;
                let characterHeight = intializedMesh.currentCharacterHeight
                let scaleDifference = 1
                if(characterHeight) {
                    let heightDifference = height / characterHeight
                    let newScale = defaultScale * heightDifference
                    scaleDifference = newScale / defaultScale
                }
             
                mesh.position.set(pos.x, pos.y, pos.z).multiplyScalar( scaleDifference);

                mesh.updateMatrixWorld(true);
                mesh.userData.isInitialized = true;
            }
            
            mesh.userData.scaleAspect = scaleAspect;
        }
        if(forceUpdate) {
            //this.ragDoll.cleanUp()
            let endEffectors = this.targetControls.slice(0, this.controlPoints.children.length);
            let poleTargets = this.targetControls.slice(this.controlPoints.children.length);
            this.updateMatrixWorld(true);
            this.ragDoll.createPoleTargets(poleTargets);//  initObject(this, this.characterObject, endEffectors, poleTargets);
            this.ragDoll.reinitialize();
            this.ragDoll.controlTargetSelection.initialize();
            this.updateAllTargetPoints();
        }
    }

    cleanUpCharacter() 
    {
        console.log("Clean up character")
        if(!this.ragDoll) return;
        this.ragDoll.updateReact();
        this.intializedSkinnedMesh = null;
        this.characterObject = null;
        this.ragDoll.cleanUp();
    }

    updatePoleTarget(object, poleTargets)
    {
        if(this.characterObject && this.characterObject.uuid === object.uuid)
        {
            for(let i = 0; i > this.poleTargets.children.length; i++)
            {
                let ikPoleTarget = this.poleTargets.children[i];
                let passedPolePosition = poleTargets[ikPoleTarget.name].position;
                ikPoleTarget.position.set(passedPolePosition.x, passedPolePosition.y, passedPolePosition.z);
                this.characterObject.worldToLocal(ikPoleTarget.position);
                ikPoleTarget.updateMatrixWorld();
                ikPoleTarget.userData.isInitialized = true;
            }
        }
    }

    selectControlPoint(uuid, event)
    {
        let ragdoll = this.ragDoll;
        let targetPoints = this.poleTargets.children.concat(this.controlPoints.children);
        this.selectedControlPoint = targetPoints.find(object => object.uuid === uuid);
        if(!this.selectedControlPoint) return;
        this.ragDoll.isEnabledIk = true;
        this.selectedControlPoint.isActivated = true;
        if(this.selectedControlPoint.userData.type === "poleTarget") 
        {
            return;
        }
        let control = this.targetControls.find(object => object.target.userData.name === this.selectedControlPoint.userData.name);
        if(this.selectedControlPoint.userData.name === "Hips")
        {
            this.ragDoll.hipsMouseDown = true;
            if(ragdoll.hipsControlTarget.control.mode === "rotate")
            {
                ragdoll.attached = true;
                ragdoll.originalObject.children[0].isRotated = true;
            }
            else
            {   
                this.ragDoll.changeControlPointsParent(this.characterObject.parent);
            } 
            control.control.pointerPressedDown(event);
        }
        else
        {
            if(control.control.mode === "rotate")
            {
                this.ragDoll.isRotation = true;
            }
        }
        if(this.selectedControlPoint.userData.name === "Head")
        {
            this.ragDoll.applyingOffset = true;
        }
    }

    deselectControlPoint()
    {
        if(this.selectedControlPoint)
        {  
            this.ragDoll.isEnabledIk = false;
            this.ragDoll.isRotation = false;
            this.selectedControlPoint.isActivated = false;
            //let characterObject = this.intializedSkinnedMesh.parent.parent;
            if(this.selectedControlPoint.userData.type === "controlPoint")
            {
                this.controlPoints.attach(this.selectedControlPoint);
                this.selectedControlPoint.updateMatrixWorld(true);
            }
            else
            {
                this.poleTargets.attach(this.selectedControlPoint);
                this.poleTargets.updateMatrixWorld(true)
                let characterMatrix = this.characterObject.matrixWorld
                let characterInverseMatrix = this.characterObject.getInverseMatrixWorld()
                this.selectedControlPoint.applyMatrix4(characterInverseMatrix)
                this.selectedControlPoint.updateMatrixWorld(true)
                let worldPosition = this.selectedControlPoint.position;
                this.selectedControlPoint.applyMatrix4(characterMatrix)
                this.selectedControlPoint.updateMatrixWorld(true)
                let poleTargets = {};
                poleTargets[this.selectedControlPoint.name] = 
                {
                    position: 
                    {
                        x: worldPosition.x,
                        y: worldPosition.y,
                        z: worldPosition.z,
                    },
                    currentCharacterHeight: this.characterObject.userData.height,
                };
                this.ragDoll.updatePoleTargets(poleTargets);

                //this.ragDoll.updateAllPoleTargets();
            }
            if(this.selectedControlPoint.userData.name === "Hips")
            {

                this.ragDoll.hipsMouseDown = false;
                if(this.ragDoll.attached)
                {
                    this.updateCharacterRotation(this.ragDoll.originalObject.children[0].name, this.ragDoll.hipsControlTarget.target.rotation);
                    this.ragDoll.attached = false;
                    this.ragDoll.originalObject.children[0].isRotated = false;
                }
                else
                {
                    this.ragDoll.changeControlPointsParent(this.controlPoints);
                    this.ragDoll.updateCharPosition(this.ragDoll.clonedObject.position);
                }
            }
            if(this.selectedControlPoint.userData.name === "Head")
            {
                this.ragDoll.applyingOffset = false;
            }
            
            this.selectedControlPoint = null;
            this.ragDoll.updateReact();
            let changes = {};
            if(this.characterObject.attachables) {
                for(let i = 0; i < this.characterObject.attachables.length; i++) {
                    let attachable = this.characterObject.attachables[i];
                    let {x, y, z} = attachable.worldPosition();
                    let rotation = new THREE.Euler().setFromQuaternion(attachable.worldQuaternion());
                    changes[attachable.userData.id] = { x, y, z, rotation:{x: rotation.x, y: rotation.y, z: rotation.z} };
                }
            }
            this.updateObjects(changes);
        }
    }

    update()
    {
        if(!this.isSelected() || !this.ragDoll || !this.ragDoll.originalObject) return;
        this.ragDoll.update();
        this.ragDoll.originalObject.updateMatrixWorld(true)

        if(this.selectedControlPoint)
        {
            let parent = this.selectedControlPoint.parent;
            if(this.selectedControlPoint.userData.type === "controlPoint")
            {
                this.controlPoints.attach(this.selectedControlPoint);
            }
            else
            {
                this.poleTargets.attach(this.selectedControlPoint);
            }
            if(this.selectedControlPoint.userData.name === "Hips")
            {
                this.instancedMesh.updateMatrixWorld(true);
                this.updateInstancedTargetPoint(this.selectedControlPoint, null, false);
                for(let i = 0; i < this.ragDoll.chainObjectsValues.length; i++)
                {
                    this.updateInstancedTargetPoint( this.ragDoll.chainObjectsValues[i].controlTarget.target, null, true);
                }
            }
            else
            {
                this.updateInstancedTargetPoint(this.selectedControlPoint, null, false);
            }
            parent.attach(this.selectedControlPoint);
        }
        else
        {
            this.updateAllTargetPoints();
        }
    }

    updateMatrixWorld(value)
    { 
        super.updateMatrixWorld(value); 
        if(this.isUpdating) return;
        if(!this.characterObject.getObjectByProperty("type", "LOD")) return;
        this.isUpdating = true;
        this.update();
        this.isUpdating = false;
    }

    raycast(raycaster, intersects)
    {
        if(!this.isSelected() || this.isIkDisabled) return;
        let values = this.isPoleTargetsVisible ? this.targetPoints : this.controlPoints.children;
        let results = raycaster.intersectObjects(values);
        for (let result of results)
        {
            result.isControlTarget = true;
            intersects.push(result);
        }
    }

    setUpdate(updateCharacterRotation, updateSkeleton, updateCharacterPos, updatePoleTargets, updateObjects)
    {
        this.updateCharacterRotation = updateCharacterRotation;
        this.ragDoll.updateSkeleton(updateSkeleton);
        this.ragDoll.updateCharacterPos(updateCharacterPos);
        this.ragDoll.updatePoleTargets = updatePoleTargets;
        this.updateObjects = updateObjects
       // this.updatePoleTargets = updatePoleTargets;
    }

    resetTargetPoint(targetPoint, color = this.defaultColor)
    {
        targetPoint.position.copy(this.defaultPosition);
        targetPoint.rotation.set(0, 0, 0);
        targetPoint.quaternion.set(0, 0, 0, 0);
        targetPoint.scale.set(0, 0, 0);
        this.updateInstancedTargetPoint(targetPoint, color);
    }

    resetAllTargetPoints()
    {
        for(let i = 0; i < this.targetPoints.length; i++)
        {
            this.resetTargetPoint(this.targetPoints[i]);
        }
    }

    updateAllTargetPoints()
    {
        for(let i = 0; i < this.targetPoints.length; i++)
        {
            this.updateInstancedTargetPoint(this.targetPoints[i]);
        }
    }

    updateInstancedTargetPoint(targetPoint, color = null, useWorld = false)
    {
        let id = targetPoint.userData.id;
        if(targetPoint.userData.type === "poleTarget" && !this.isPoleTargetsVisible)
        {
            this.instancedMesh.setPositionAt( id , this.defaultPosition );
        }
        else if(!useWorld)
        {
            this.instancedMesh.setPositionAt( id , targetPoint.position );
            this.instancedMesh.setQuaternionAt( id , targetPoint.quaternion );
            this.instancedMesh.setScaleAt( id , targetPoint.scale );
        }
        else
        {
            targetPoint.applyMatrix4(this.instancedMesh.parent.parent.getInverseMatrixWorld());
            this.instancedMesh.setPositionAt( id , targetPoint.position );
            this.instancedMesh.setQuaternionAt( id , targetPoint.quaternion );
            this.instancedMesh.setScaleAt( id , targetPoint.scale);
            targetPoint.applyMatrix4(this.instancedMesh.parent.parent.matrixWorld);
        }
        
        if(color)
        {
            this.instancedMesh.setColorAt(id, color );
            this.instancedMesh.needsUpdate("colors");
        }
        this.instancedMesh.needsUpdate("position");
        this.instancedMesh.needsUpdate("quaternion");
        this.instancedMesh.needsUpdate("scale");
    }

    isSelected()
    {
        return this.parent ? true : false;
    }

    setCamera(camera)
    {
        if(!this.ragDoll) return
        this.ragDoll.controlTargetSelection.camera = camera;
        for(let i = 0; i < this.targetControls.length; i++)
        {
            this.targetControls[i].setCamera(camera);
        }
    }

    removeFromParent(uuid)
    {
        if(this.intializedSkinnedMesh && this.intializedSkinnedMesh.uuid === uuid)
        {
            this.ragDoll.controlTargetSelection.dispose();
            this.ragDoll.removeFromScene();
            this.intializedSkinnedMesh = null;
        }
    }

    changeDomElement(domElement) {
        if(!this.ragDoll) return
        this.ragDoll.controlTargetSelection.dispose();
        this.ragDoll.controlTargetSelection.domElement = domElement;
        for(let i = 0; i < this.targetControls.length; i++) {
            let controlPoint = this.targetControls[i];
            controlPoint.removeEventsFromControlTarget();
            controlPoint.domElement = domElement;
            controlPoint.control.dispose();
            controlPoint.control.domElement = domElement;
           // controlPoint.addEventsToControlTarget();
        }
        this.ragDoll.controlTargetSelection.initialize();
    }
}

const intializeInstancedMesh = (mesh, camera, domElement, scene) =>
{
    let sphereGeometry = new THREE.SphereBufferGeometry( 0.35, 8, 6 );
    let instance = SGIKHelper.getInstance();
    let controlsName = [ "Head", "LeftHand", "RightHand", "LeftLeg", "RightLeg", "Hips"];
    let listOfControlTargets = ["leftArmPole", "rightArmPole", "leftLegPole", "rightLegPole"];
    let sizeOfTargets = listOfControlTargets.length + controlsName.length;
    let material = new THREE.MeshBasicMaterial({
        color: 0x46428a,    
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 1,
        flatShading: false});
    let newMesh = mesh ? mesh : new THREE.Mesh(sphereGeometry, material);
    instance.material = material;
    instance.instancedMesh = new THREE.CustomInstancedMesh(newMesh.geometry, material, sizeOfTargets, true, true, false);
    instance.defaultPosition = new THREE.Vector3(5000, 5000, 5000);
    instance.defaultColor = new THREE.Color(0x6a4dff);
    instance.instancedMesh.userData.preventInteraction = true;
    instance.instancedMesh.userData.type = "instancedMesh";
    instance.instancedMesh.visible = true;
    let sizeOfControlPoints = controlsName.length;
    for(let i = 0; i < sizeOfControlPoints; i++)
    {
        let controlPoint = new THREE.Mesh(newMesh.geometry, material);
        controlPoint.userData.id = --sizeOfTargets;
        controlPoint.material.visible = false;
        controlPoint.userData.type = "controlPoint";
        controlPoint.name = "controlPoint";
        controlPoint.userData.name = controlsName.shift();

        let targetControl = new TargetControl(camera, domElement, "controlPoint");
        targetControl.initialize(scene, new THREE.Vector3(0, 0, 0), controlPoint);
        
        instance.controlPoints.add(controlPoint);
        instance.targetControls.push(targetControl);
        instance.resetTargetPoint(controlPoint);
    }
    let poleTargetColor = new THREE.Color(0xb271c1);
    for(let i = 0; i < 4; i++)
    {
        let poleTarget = new THREE.Mesh(newMesh.geometry, material);
        poleTarget.material.visible = false;
       // poleTarget.material.needsUpdate = true;
        poleTarget.userData.id = --sizeOfTargets;
        poleTarget.userData.type = "poleTarget";
        poleTarget.name = "poleTarget";
        poleTarget.name = listOfControlTargets.shift();
        poleTarget.visible = instance.isPoleTargetsVisible;

        let targetControl = new TargetControl(camera, domElement, "controlPoint");
        targetControl.initialize(scene, new THREE.Vector3(0, 0, 0), poleTarget);
        
        instance.targetControls.push(targetControl);
        targetControl.setBone(poleTarget)
        instance.poleTargets.add(poleTarget);
        instance.resetTargetPoint(poleTarget, poleTargetColor);
    }
}
module.exports = SGIKHelper;
