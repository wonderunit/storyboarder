const THREE = require("three")
var InstancedMesh = require('./../../vendor/three-instanced-mesh')( THREE )
const RagDoll = require("./objects/IkObjects/Ragdoll")
require('./utils/Object3dExtension')
const TargetControl = require("./objects/TargetControl")
const ControlTargetSelection = require( "./objects/ControlTargetSelection")
let instance = null
class SGIKHelper extends THREE.Object3D
{
    constructor(mesh, scene, camera, domElement)
    {
        if(!instance)
        {
            super();
            instance = this;
            this.controlPoints = new THREE.Group();
            this.selectedContolPoint = null;
            instance.ragDoll = new RagDoll();
            this.poleTargets = new THREE.Group();
            this.transformControls = new THREE.Group();
            this.targetControls = [];
            this.selectedControlPoint = null;
            this.intializedSkinnedMesh = null;
            this.isIkDisabled = false;
            this.add(this.poleTargets);
            this.isPoleTargetsVisible = false;
            this.add(this.controlPoints);
            this.add(this.transformControls);
            intializeInstancedMesh(mesh, camera, domElement, scene);
            this.add(this.instancedMesh);
            this.targetPoints = this.poleTargets.children.concat(this.controlPoints.children);
            this.regularHeight = 1.1;
            this.isInitialized = true;
            this.userData.type = "IkHelper";
            let controlTargetSelection = new ControlTargetSelection(domElement, camera, this.targetControls);
            this.ragDoll.controlTargetSelection = controlTargetSelection;
            this.isUpdating = false;
     /*        instance.instancedMesh.layers.disable(0)
            instance.instancedMesh.layers.enable(1)
            instance.instancedMesh.layers.disable(2) */
        }
        return instance;
    }
    
    static getInstance(mesh, scene, camera, domElement) 
    {
        return instance ? instance : new SGIKHelper(mesh, scene, camera, domElement)
    }

    initialize(object, height, skinnedMesh, props)
    {
        let ragDoll = instance.ragDoll;
        if(this.characterObject) ragDoll.controlTargetSelection.initialize();
        if(this.intializedSkinnedMesh && this.intializedSkinnedMesh.uuid === skinnedMesh.uuid) return;
        this.characterObject = object;
        
        this.intializedSkinnedMesh = skinnedMesh;
        let meshes = this.targetPoints;
        let initializedMeshes = props.poleTargets ? props.poleTargets : [];
        let scaleAspect = height / this.regularHeight / object.scale.x;
        let defaultScale = 0.1
        for(let i = 0; i < meshes.length; i++)
        {
            let mesh = meshes[i];
            let intializedMesh = initializedMeshes[mesh.name];
            // Checks if there's already info for current mesh
            // Info like position
            if(intializedMesh)
            {
                let pos = intializedMesh.position;
                mesh.position.set(pos.x, pos.y, pos.z);
                this.characterObject.worldToLocal(mesh.position);
                mesh.updateMatrixWorld();
                mesh.userData.isInitialized = true;
            }
            else
            {
                mesh.userData.isInitialized = false;
            }
            mesh.scale.set(defaultScale, defaultScale, defaultScale).multiplyScalar(scaleAspect);
            
            mesh.userData.scaleAspect = scaleAspect;
        }
        ragDoll.initObject(this, object, this.targetControls, this.poleTargets.children);
        ragDoll.reinitialize();
        ragDoll.controlTargetSelection.initialize();
        ragDoll.controlTargetSelection.initialize();
        this.updateAllTargetPoints();
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
            if(this.selectedControlPoint.userData.type === "controlPoint")
            {
                this.controlPoints.attach(this.selectedControlPoint);
                this.selectedControlPoint.updateMatrixWorld(true);
            }
            else
            {
                this.poleTargets.attach(this.selectedControlPoint);
                let worldPosition = this.selectedControlPoint.position;
                let poleTargets = {};
                poleTargets[this.selectedControlPoint.name] = 
                {
                    position: 
                    {
                        x: worldPosition.x,
                        y: worldPosition.y,
                        z: worldPosition.z,
                    }
                };
                this.updatePoleTargets(poleTargets);
            }
            if(this.selectedControlPoint.userData.name === "Hips")
            {

                this.ragDoll.hipsMouseDown = false;
                if(this.ragDoll.attached)
                {
                    this.ragDoll.updateCharacterRotation(this.ragDoll.originalObject.children[0].name, this.ragDoll.hipsControlTarget.target.rotation);
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
        if(!this.isSelected()) return;
        this.ragDoll.update();

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

    setUpdate(updateCharacterSkeleton, updateSkeleton, updateCharacterPos, updatePoleTargets, updateObjects)
    {
        this.ragDoll.updateCharacterRotation(updateCharacterSkeleton);
        this.ragDoll.updateSkeleton(updateSkeleton);
        this.ragDoll.updateCharacterPos(updateCharacterPos);
        this.updateObjects = updateObjects
        this.updatePoleTargets = updatePoleTargets;
    }

    resetTargetPoint(targetPoint)
    {
        targetPoint.position.copy(this.defaultPosition);
        targetPoint.rotation.set(0, 0, 0);
        targetPoint.quaternion.set(0, 0, 0, 1);
        targetPoint.scale.set(1, 1, 1);
        this.updateInstancedTargetPoint(targetPoint, this.defaultColor);
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
            targetPoint.applyMatrix(this.instancedMesh.parent.parent.getInverseMatrixWorld());
            this.instancedMesh.setPositionAt( id , targetPoint.position );
            this.instancedMesh.setQuaternionAt( id , targetPoint.quaternion );
            this.instancedMesh.setScaleAt( id , targetPoint.scale);
            targetPoint.applyMatrix(this.instancedMesh.parent.parent.matrixWorld);
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
            this.ragDoll.controlTargetSelection.dispose()
            this.ragDoll.removeFromScene();
            this.intializedSkinnedMesh = null;
        }
    }

    clone() {
        
    }
}

const intializeInstancedMesh = (mesh, camera, domElement, scene) =>
{
    let sphereGeometry = new THREE.SphereBufferGeometry( 0.2, 8, 6 );
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
        flatShading: true});
    let newMesh = mesh ? mesh : new THREE.Mesh(sphereGeometry, material);
    instance.material = material;
    instance.instancedMesh = new InstancedMesh(newMesh.geometry, material, sizeOfTargets, true, true, false);
    instance.defaultPosition = new THREE.Vector3(0, 0, 0);
    instance.defaultColor = new THREE.Color(0x6a4dff);
    instance.instancedMesh.userData.preventInteraction = true;
    instance.instancedMesh.userData.type = "instancedMesh";
    instance.instancedMesh.visible = true;
    //instance.instancedMesh.layers.disable(0)
    //instance.instancedMesh.layers.enable(1)
    //instance.instancedMesh.layers.disable(2)
    for(let i = 0; i < 6; i++)
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
    for(let i = 0; i < 4; i++)
    {
        let poleTarget = new THREE.Mesh(newMesh.geometry, material);
        poleTarget.material.visible = false;
        poleTarget.userData.id = --sizeOfTargets;
        poleTarget.userData.type = "poleTarget";
        poleTarget.name = listOfControlTargets.shift();
        poleTarget.visible = instance.isPoleTargetsVisible;
        instance.poleTargets.add(poleTarget);
        instance.resetTargetPoint(poleTarget);
    }
}
module.exports = SGIKHelper;
