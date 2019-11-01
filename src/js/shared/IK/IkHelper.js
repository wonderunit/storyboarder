const THREE = require("three");
const RagDoll = require("./XrRagdoll");
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
                mesh.updateMatrixWorld();
                mesh.userData.isInitialized = true;
            }
            else
            {
                mesh.userData.isInitialized = false;
            }
            mesh.scale.set(0.1, 0.1, 0.1).multiplyScalar(scaleAspect);
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
            if(this.selectedControlPoint.userData.type === "controlPoint")
            {
                this.controlPoints.attach(this.selectedControlPoint);
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

    setUpdate(updateCharacterSkeleton, updateSkeleton, updateCharacterPos, updatePoleTargets)
    {
        this.ragDoll.updateCharacterRotation(updateCharacterSkeleton);
        this.ragDoll.updateSkeleton(updateSkeleton);
        this.ragDoll.updateCharacterPos(updateCharacterPos);
        this.updatePoleTargets = updatePoleTargets;
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

    isInMiniMode(value)
    {
        this.isIkDisabled = value;
        if(this.isSelected() && this.isIkDisabled)
        {
            this.parent.remove(this);
        }
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
    instance.instancedMesh = new THREE.InstancedMesh(newMesh.geometry, material, sizeOfTargets, true, true, false);
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
