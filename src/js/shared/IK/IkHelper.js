const THREE = require("three");
const RagDoll = require("./XrRagdoll");
require('./../../vendor/three-instanced-mesh')
require('./utils/Object3dExtension');
let instance = null;
class IKHelper extends THREE.Object3D
{
    constructor(mesh)
    {
        if(!instance)
        {
            super();
            instance = this;
            this.controlPoints = new THREE.Group();
            this.selectedContolPoint = null;
            instance.ragDoll = new RagDoll();
            this.poleTargets = new THREE.Group();
            this.selectedControlPoint = null;
            this.intializedSkinnedMesh = null;
            this.isIkDisabled = false;
            this.add(this.poleTargets);
            this.isPoleTargetsVisible = true;
            this.add(this.controlPoints);
            intializeInstancedMesh(mesh);
            this.add(this.instancedMesh);
            this.targetPoints = this.poleTargets.children.concat(this.controlPoints.children);
            this.regularHeight = 1.8;
            this.updateStarted = false;
        }
        return instance;
    }

    static getInstance(mesh) 
    {
        return instance ? instance : new IKHelper(mesh)
    }

    initialize(skinnedMesh, height)
    {
        if(this.intializedSkinnedMesh && this.intializedSkinnedMesh.uuid === skinnedMesh.uuid) return;
        this.intializedSkinnedMesh = skinnedMesh;
        let ragDoll = instance.ragDoll;
        let meshes = this.targetPoints;
        let initializedMeshes = skinnedMesh.parent.parent.userData.poleTargets ? skinnedMesh.parent.parent.userData.poleTargets : [];
        let scaleAspect = height / this.regularHeight;
        let defaultScale = 0.1;
        for(let i = 0; i < meshes.length; i++)
        {
            let mesh = meshes[i];
            let intializedMesh = initializedMeshes[mesh.name];
            // Checks if there's already info for current mesh
            // Info like position
            if(intializedMesh)
            {
                let pos = intializedMesh.position;
                let characterHeight = intializedMesh.currentCharacterHeight;
                let scaleDifference = 1;
                if(characterHeight) {
                    let heightDifference = height / characterHeight;
                    let newScale = defaultScale * heightDifference;
                    scaleDifference = newScale / defaultScale;
                }
                mesh.position.set(pos.x, pos.y, pos.z).multiplyScalar( scaleDifference);
                mesh.updateMatrixWorld(true);
                mesh.userData.isInitialized = true;
            }
            else
            {
                mesh.userData.isInitialized = false;
            }
            mesh.scale.set(defaultScale, defaultScale, defaultScale).multiplyScalar(scaleAspect);
            mesh.userData.scaleAspect = scaleAspect;
        }
        ragDoll.initObject(skinnedMesh.parent.parent, this.controlPoints.children, this.poleTargets.children);
        ragDoll.reinitialize();
        this.updateAllTargetPoints();
    }

    getControlPointByName(name)
    {
        return this.ragDoll.chainObjects[name].controlTarget;
    }

    selectControlPoint(name)
    {
        let targetPoints = this.poleTargets.children.concat(this.controlPoints.children);
        this.selectedControlPoint = targetPoints.find(object => object.name === name);
        if(!this.selectedControlPoint) return;
        this.ragDoll.isEnabledIk = true;
        if(name === "Hips")
        {
            this.ragDoll.hipsMouseDown = true;
            this.ragDoll.changeControlPointsParent(this.intializedSkinnedMesh.parent.parent.parent);
        }
        if(name === "Head")
        {
            this.ragDoll.applyingOffset = true;
        }
    }

    deselectControlPoint()
    {
        if(this.selectedControlPoint)
        {  
            this.ragDoll.isEnabledIk = false;
            let characterObject = this.intializedSkinnedMesh.parent.parent;
            if(this.selectedControlPoint.userData.type === "controlPoint")
            {
                this.controlPoints.attach(this.selectedControlPoint);
            }
            else
            {
                this.poleTargets.attach(this.selectedControlPoint);
                this.poleTargets.updateMatrixWorld(true)
                let characterMatrix = characterObject.matrixWorld
                let characterInverseMatrix = characterObject.getInverseMatrixWorld()
                this.selectedControlPoint.applyMatrix4(characterInverseMatrix)
                this.selectedControlPoint.updateMatrixWorld(true)
                let worldPosition = this.selectedControlPoint.position;
                this.selectedControlPoint.applyMatrix4(characterMatrix)
                this.selectedControlPoint.updateMatrixWorld(true)
                this.selectedControlPoint.userData.isInitialized = true;
                let poleTargets = {};
                poleTargets[this.selectedControlPoint.name] = 
                {
                    position: 
                    {
                        x: worldPosition.x,
                        y: worldPosition.y,
                        z: worldPosition.z,
                    },
                    currentCharacterHeight: characterObject.userData.height,
                };
                this.ragDoll.updatePoleTargets(poleTargets);
            }
            if(this.selectedControlPoint.name === "Hips")
            {
                this.ragDoll.updateCharPosition(this.ragDoll.clonedObject.position);
                this.ragDoll.changeControlPointsParent(this.controlPoints);
                this.ragDoll.hipsMouseDown = false;
            }
            if(this.selectedControlPoint.name === "Head")
            {
                this.ragDoll.applyingOffset = false;
            }
            this.selectedControlPoint = null;
            this.ragDoll.updateReact();
            let changes = {};
            if(characterObject.attachables) {
                for(let i = 0; i < characterObject.attachables.length; i++) {
                    let attachable = characterObject.attachables[i];
                    let { x, y, z } = attachable.worldPosition();
                    let rotation = new THREE.Euler().setFromQuaternion(attachable.worldQuaternion());
                    changes[attachable.userData.id] = { x, y, z, rotation: { x: rotation.x, y: rotation.y, z: rotation.z } };
                }
            }
            this.updateObjects(changes);
        }
    }

    update()
    {
        if(!this.isSelected() || !this.ragDoll || !this.ragDoll.originalObject) return;
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
            if(this.selectedControlPoint.name === "Hips")
            {
                this.instancedMesh.updateMatrixWorld(true);
                this.updateInstancedTargetPoint(this.selectedControlPoint, null, false);
                for(let i = 0; i < this.ragDoll.chainObjectsValues.length; i++)
                {
                    this.updateInstancedTargetPoint( this.ragDoll.chainObjectsValues[i].controlTarget, null, true);
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
        if(this.updateStarted) return;
        super.updateMatrixWorld(value); 
        this.updateStarted = true;
        this.update();
        this.updateStarted = false;
    }

    raycast(raycaster, intersects)
    {
        if(!this.isSelected() && this.isIkDisabled) return;
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
        this.ragDoll.setUpdatePoleTargets(updatePoleTargets);
        this.updateObjects = updateObjects;
    }

    resetTargetPoint(targetPoint)
    {
        targetPoint.position.copy(this.defaultPosition);
        targetPoint.rotation.set(0, 0, 0);
        targetPoint.quaternion.set(0, 0, 0, 0);
        targetPoint.scale.set(0, 0, 0);
        this.updateInstancedTargetPoint(targetPoint, this.defaultColor);
    }

    updateAllTargetPoints()
    {
        for(let i = 0; i < this.targetPoints.length; i++)
        {
            let targetPoint = this.targetPoints[i];
            let parent = targetPoint.parent;
            if(targetPoint.userData.type === "controlPoint")
            {
                this.controlPoints.attach(targetPoint);
            }
            else
            {
                this.poleTargets.attach(targetPoint);
            }
            this.updateInstancedTargetPoint(this.targetPoints[i]);
            parent.attach(targetPoint);
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

    isInMiniMode(value)
    {
        this.isIkDisabled = value;
        if(this.isSelected() && this.isIkDisabled)
        {
            this.parent.remove(this);
        }
    }

    clone() {
        
    }
}

const intializeInstancedMesh = (mesh) =>
{
    let sphereGeometry = new THREE.SphereBufferGeometry( 0.5, 8, 6 );
    let instance = IKHelper.getInstance();
    let controlPointsAmount = 6;
    let listOfControlTargets = ["leftArmPole", "rightArmPole", "leftLegPole", "rightLegPole"];
    let sizeOfTargets = listOfControlTargets.length + controlPointsAmount;
    let material = new THREE.MeshBasicMaterial({
        color: 0x6a4dff,    
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.7,
        flatShading: true});
    let newMesh = mesh ? mesh : new THREE.Mesh(sphereGeometry, material);
    instance.material = material;
    instance.instancedMesh = new THREE.CustomInstancedMesh(newMesh.geometry, material, sizeOfTargets, true, true, false);
    instance.defaultPosition = new THREE.Vector3(5000, 5000, 5000);
    instance.defaultColor = new THREE.Color(0x6a4dff);
    instance.instancedMesh.userData.preventInteraction = true;
    instance.instancedMesh.userData.type = "instancedMesh";
    for(let i = 0; i < 6; i++)
    {
        let controlPoint = new THREE.Mesh(newMesh.geometry, material);
        controlPoint.userData.id = --sizeOfTargets;
        controlPoint.material.visible = false;
        controlPoint.userData.type = "controlPoint";
        instance.controlPoints.add(controlPoint);
        instance.resetTargetPoint(controlPoint);
    }
    for(let i = 0; i < 4; i++)
    {
        let poleTarget = new THREE.Mesh(newMesh.geometry, material);
        poleTarget.material.visible = false;
        poleTarget.userData.id = --sizeOfTargets;
        poleTarget.userData.type = "poleTarget";
        poleTarget.name = listOfControlTargets.shift();
        instance.poleTargets.add(poleTarget);
        instance.resetTargetPoint(poleTarget);
    }
}
module.exports = IKHelper;
