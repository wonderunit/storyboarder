const {IK}  = require("../../core/three-ik");
const IkObject = require( "./IkObject");
const THREE = require( "three");
const PoleConstraint = require( "../../constraints/PoleConstraint");
const PoleTarget = require( "../PoleTarget");
const CopyRotation = require( "../../constraints/CopyRotation");
const ResourceManager = require("../../ResourceManager");
const TargetControl = require("../TargetControl")
require("../../utils/Object3dExtension");
// Ragdoll is class which is used to set all specific details to ikrig
// Like head upward, contraints to limb, transformControls events etc.
class Ragdoll extends IkObject
{
    constructor()
    {
        super();
        this.hipsMouseDown = false;
        this.controlTargetSelection = null;
        this.originalObjectTargetBone = [];
        this.originalObjectTargetBone.push(4);
        this.originalObjectTargetBone.push(11);
        this.originalObjectTargetBone.push(35);
        this.originalObjectTargetBone.push(58);
        this.originalObjectTargetBone.push(63);
        this.objectTargetDiff = new THREE.Vector3();
        this.poleTargetsPosition = {};
    }
    
    //#region External Methods
    // Initializes ragdoll set up all neccessary information 
    initObject(scene, object, controlTargets, poleTargets )
    {
        this.objectTargetDiff = new THREE.Vector3();
        super.initObject(scene, object, controlTargets );
        this.createPoleTargets(poleTargets);
        this.resetControlPoints();
        for(let i = 0; i < controlTargets.length; i++)
        {
            controlTargets[i].updateInitialPosition = () => this.setUpControlTargetsInitialPosition();
        }
    }

    updateSkeleton(updateCharacterSkeleton)
    {
        this.updateCharacterSkeleton = updateCharacterSkeleton;
    }

    updateCharacterPos(updateCharPosition)
    {
        this.updateCharPosition = updateCharPosition;
    }

    cleanUp() 
    {
        if(!this.clonedObject) return
        let lod = this.clonedObject.getObjectByProperty("type", "LOD");
        for(let i = 0; i < lod.children.length; i++) {
            lod.children[i].geometry.dispose();
            lod.children[i].material.dispose();
        }
        this.clonedObject = null;
        this.originalObject = null;
        this.rigMesh = null;
        this.originalMesh = null;
        this.hipsControlTarget.bone = null;
        this.hipsControlTarget = null;
        this.ik = null;
        this.hips = null;
        this.ikSwitcher.cleanUp();
        this.ikSwitcher = null;

        let keys = Object.keys(this.chainObjects);
        for(let i = 0; i < keys.length; i++) {
            let chainObject = this.chainObjects[keys[i]]
            chainObject.controlTarget.bone = null;
            chainObject.controlTarget = null;
            let joints = chainObject.chain.joints;
            for(let i = 0; i < joints.length; i++ ) {
                joints[i].bone = null; 
                joints[i].constraints = [];
                joints[i].ikConstraints = [];
                joints[i] = null;
            }
            let chain = chainObject.chain;
            chain.joints = [];
            chain.chains = [];
            chain.base = null;
            chain.effector = null;
            chain.effectorIndex = null;
            chain.target = null;
            chainObject.chain = null;
            chainObject.constraints = [];
            if(chainObject.poleConstraint) {
                chainObject.poleConstraint.poleTarget.inverseMatrixOfBone = null;
                chainObject.poleConstraint.poleTarget = null;
            }
            chainObject.poleConstraint = null;
            chainObject.lastBone = null;
        }
        this.chainObjects = [];
        
    }

    // Runs cycle which is updating object
    update()
    {
        super.update();
        if(IK.firstRun)
        {
            IK.firstRun = false;
            this.setUpHipsControlTargetRotation();
        }
        if(!this.isEnabledIk)
        {
            this.ikSwitcher.applyToIk();
            this.moveRagdoll();
            this.setUpControlTargetsInitialPosition();
            this.setUpHipsControlTargetRotation();
            this.recalculateHipsDiff();
            if(!IK.firstRun)
                this.resetControlPoints();
        }
        else
        {
            if(this.hipsControlTarget.control.mode === "rotate" && this.attached && !this.hipsIsMoving && this.originalObject.children[0].isRotated)
            {
                let worldQuaternion = this.resourceManager.getQuaternion();
                let inverseParentQuat = this.resourceManager.getQuaternion();
                let vector = this.resourceManager.getVector3();
                this.hipsControlTarget.target.getWorldQuaternion(worldQuaternion);
                this.originalObject.matrixWorld.decompose(vector, inverseParentQuat, vector);
                worldQuaternion.premultiply(inverseParentQuat.inverse());
                this.hips.quaternion.copy(worldQuaternion);
                this.hips.updateMatrixWorld(true);
                this.resourceManager.release(worldQuaternion);
                this.resourceManager.release(inverseParentQuat);
                this.resourceManager.release(vector);
            }
            this.limbsFollowRotation();
            this.ikSwitcher.applyChangesToOriginal();
        }
    }

    // Runs after update to apply changes to object after ik solved
    lateUpdate()
    {
        super.lateUpdate();
        if(this.hipsMouseDown)
        {
            let hipsTarget = this.hipsControlTarget.target;
            let targetPosition = this.resourceManager.getVector3();
            let targetPos = this.resourceManager.getVector3();
            hipsTarget.getWorldPosition(targetPosition);
            hipsTarget.getWorldPosition(targetPos);

            targetPos.sub(this.objectTargetDiff);
            this.clonedObject.position.copy(targetPos);
            this.clonedObject.updateMatrixWorld(true);
            
            this.hips.parent.worldToLocal(targetPosition);
            this.hips.position.copy(targetPosition);
            this.hips.updateMatrix();
            this.originalObject.position.copy(this.clonedObject.position);
            this.resourceManager.release(targetPosition);
            this.resourceManager.release(targetPos);
        }
    }

    // Reintializes whole body and ik joints when character was changed
    // Changing character height, head size will fire reinitialization
    reinitialize()
    {    
        let chainObjects = this.chainObjectsValues;
        this.clonedObject.scale.copy(this.originalObject.worldScale());
        this.clonedObject.position.copy(this.originalObject.worldPosition());
        this.clonedObject.quaternion.copy(this.originalObject.worldQuaternion());
        this.clonedObject.updateMatrixWorld(true);
        for(let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i].chain;
            chain.reinitializeJoints();
        }
        this.resetControlPoints();
        this.calculteBackOffset();
        this.recalculateHipsDiff();
    }

    recalculateHipsDiff()
    {
        let hipsTarget = this.hipsControlTarget.target;
        let armatureInverseMatrixWorld = this.resourceManager.getMatrix4();
        armatureInverseMatrixWorld.getInverse(this.rigMesh.skeleton.bones[0].parent.matrixWorld);

        hipsTarget.applyMatrix4(this.rigMesh.skeleton.bones[0].parent.matrixWorld);
        let hipsWP = this.resourceManager.getVector3().copy(hipsTarget.position);
        hipsTarget.applyMatrix4(armatureInverseMatrixWorld);

        let originalObjectWp = this.resourceManager.getVector3().copy(this.originalObject.position);
        this.objectTargetDiff.subVectors(hipsWP, originalObjectWp);

        this.resourceManager.release(armatureInverseMatrixWorld);
        this.resourceManager.release(hipsWP);
        this.resourceManager.release(originalObjectWp);
    }

    // Removes object and all it's meshes from scene
    removeFromScene()
    {
        let scene = this.scene;
        super.removeFromScene(scene);
        this.controlTargetSelection.dispose();
    }   

    // Moves ragdoll hips when original object moved
    moveRagdoll()
    {
        this.originalObject.matrixWorld.decompose(  this.clonedObject.position,  this.clonedObject.quaternion,  this.clonedObject.scale );
    }
    //#endregion

    //#region Internal methods

    createPoleTargets(poleTargets)
    {
        let polePositions = {
            "LeftHand": new THREE.Vector3(0.10, -0.10, -0.3),
            "RightHand": new THREE.Vector3(-0.10, -0.10, -0.3),
            "LeftFoot": new THREE.Vector3(0, 0.2, 0.3),
            "RightFoot": new THREE.Vector3(0, 0.2, 0.3)
        };
        let backChain = this.chainObjects["Head"].chain;     
        for(let i = 0; i < poleTargets.length; i++)
        {
            let poleTarget = poleTargets[i];
            let poleTargetMesh = poleTarget.target;
            poleTargetMesh.characterId = this.originalObject.uuid;
            let chainName = interpretatedPoleTargetsName(poleTargetMesh.name);
            let chain = this.chainObjects[chainName].chain;
            if(poleTargetMesh.userData.isInitialized)
            {    
                let boneMatrix = this.resourceManager.getMatrix4();
                this.takeBoneInTheMeshSpace(this.rigMesh, poleTargetMesh, boneMatrix);
                let bonePosition = new THREE.Vector3().setFromMatrixPosition(boneMatrix)
                this.takeBoneInTheMeshSpace(this.rigMesh, this.hips, boneMatrix);
                let hipsPosition = new THREE.Vector3().setFromMatrixPosition(boneMatrix)
                this.resourceManager.release(boneMatrix);

                let hipsOffset = bonePosition.sub(hipsPosition);
                poleTarget.offsetWithoutHips = hipsOffset.clone();
            }
            else
            {
                this.initPoleTargets(chain, polePositions[chainName], poleTarget, poleTargetMesh);
            }
            let poleConstraint = new PoleConstraint(chain, poleTarget);
            chain.joints[0].addIkConstraint(poleConstraint);
            this.chainObjects[chainName].poleConstraint = poleConstraint;
        }

        let copyRotation = new CopyRotation(backChain, backChain.joints[4]);
        copyRotation.influence = 50;
        backChain.joints[3].addIkConstraint(copyRotation);
        
    }

    // Initiallizes pole target for pole contraints
    initPoleTargets(chain, offset, poleTarget, poleTargetMesh)
    {
       // poleTargetMesh.position.copy(offset)
        poleTarget.initialOffset = offset.multiplyScalar(poleTargetMesh.userData.scaleAspect);
        this.calculatePoleTargetOffset(poleTarget, chain);
        poleTarget.target.position.copy(poleTarget.poleOffset)
        let bone = chain.joints[0].bone.parent;
        let boneMatrix = this.resourceManager.getMatrix4();
        this.takeBoneInTheMeshSpace(this.rigMesh, bone, boneMatrix);
        poleTarget.inverseMatrixOfBone = new THREE.Matrix4().getInverse(boneMatrix);
        this.resourceManager.release(boneMatrix);
        poleTarget.target.updateMatrixWorld(true)
        return poleTarget;
    }

    // Calculates offset of pole target position
    // take in consideration current hips
    // so pole target binded to hips 
    calculatePoleTargetOffset(poleTarget, chain)
    {
        let offset = poleTarget.initialOffset;
        let bone = chain.joints[chain.joints.length - 2].bone;
        let boneMatrix = this.resourceManager.getMatrix4();
        this.rigMesh.updateWorldMatrix(true, true);
        bone.updateMatrixWorld(true);
        this.hips.updateMatrixWorld(true);
        this.takeBoneInTheMeshSpace(this.rigMesh, bone, boneMatrix);
        let bonePosition = new THREE.Vector3().setFromMatrixPosition(boneMatrix)
        this.takeBoneInTheMeshSpace(this.rigMesh, this.hips, boneMatrix);
        let hipsPosition = new THREE.Vector3().setFromMatrixPosition(boneMatrix)
        this.resourceManager.release(boneMatrix);
        let hipsOffset = bonePosition.sub(hipsPosition);
        hipsOffset.add(offset);
        poleTarget.offsetWithoutHips = hipsOffset.clone();
        hipsOffset.add(this.hips.position);
        poleTarget.poleOffset = hipsOffset;
    }

    changeControlPointsParent(parent)
    {
        let chainObjects = this.chainObjectsValues;
        parent.attach(this.hipsControlTarget.target);
        this.hipsControlTarget.target.updateMatrixWorld(true);
        for(let i = 0; i < chainObjects.length; i++)
        {
            parent.attach(chainObjects[i].controlTarget.target);
            chainObjects[i].controlTarget.target.updateMatrixWorld();
        }
    }

    setUpControlTargetsInitialPosition()
    {
        let chainObjects = this.chainObjectsValues;
        for(let i = 0; i < chainObjects.length; i++)
        {
            let joints = chainObjects[i].chain.joints;
            let bone = joints[joints.length-1].bone;
            let target = chainObjects[i].controlTarget.target;

            let boneQuate = this.resourceManager.getQuaternion();
            let parentInverseQuat = this.resourceManager.getQuaternion();

            bone.getWorldQuaternion(boneQuate);
            this.hips.parent.getWorldQuaternion(parentInverseQuat).inverse();
            target.quaternion.copy(boneQuate.premultiply(parentInverseQuat));
            
            this.resourceManager.release(parentInverseQuat);
            this.resourceManager.release(boneQuate);

            target.inverseInitialQuaternion = bone.worldQuaternion().inverse().multiply(this.hips.worldQuaternion());
        }
    }

    setUpHipsControlTargetRotation()
    {
        let bone = this.hips;
        let target = this.hipsControlTarget.target;

        let boneQuate = this.resourceManager.getQuaternion();
        let parentInverseQuat = this.resourceManager.getQuaternion();
        let targetWorldInverseQuat = this.resourceManager.getQuaternion();

        this.hips.parent.getWorldQuaternion(parentInverseQuat).inverse();
        bone.getWorldQuaternion(boneQuate);
        target.quaternion.copy(boneQuate.premultiply(parentInverseQuat));
        
        this.resourceManager.release(parentInverseQuat);
        this.resourceManager.release(boneQuate);
        this.resourceManager.release(targetWorldInverseQuat);

    }

    resetControlPoints()
    {
        if(this.hipsMouseDown) return; 
        let chainObjects = this.chainObjectsValues;
        let boneMatrix = this.resourceManager.getMatrix4();
        this.takeBoneInTheMeshSpace(this.rigMesh, this.hips, boneMatrix);
        this.hipsControlTarget.target.position.setFromMatrixPosition(boneMatrix);
        this.hipsControlTarget.target.updateMatrixWorld(true);
        for(let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i].chain;
            let jointBone = chain.joints[chain.joints.length - 1].bone;
            this.takeBoneInTheMeshSpace(this.rigMesh, jointBone, boneMatrix);
            chainObjects[i].controlTarget.target.position.setFromMatrixPosition(boneMatrix);
            chainObjects[i].controlTarget.target.updateMatrixWorld(true);
        }
        this.resourceManager.release(boneMatrix);
        this.calculteBackOffset();
    }

    updateReact()
    {       
        if (!this.originalObject) {
            return false
        }
        
        let changedSkeleton = [];
        let position = new THREE.Vector3();
        let skinnedMesh = this.originalObject.getObjectByProperty("type", "SkinnedMesh");
        if(!skinnedMesh) return;
        for (let bone of this.originalObject.getObjectByProperty("type", "SkinnedMesh").skeleton.bones)
        {
            if(!this.ikSwitcher.ikBonesName.some((boneName) => bone.name === boneName ))
            {
                continue;
            }
            bone.updateMatrixWorld(true)
            let rotation = bone.rotation
            position.copy(bone.position)
            changedSkeleton.push({ 
              name: bone.name,
              position: {
                x: position.x,
                y: position.y,
                z: position.z
              },
              rotation: { 
                x: rotation.x, 
                y: rotation.y, 
                z: rotation.z
              }
            })
        }
        if(changedSkeleton.length > 0)
        this.updateCharacterSkeleton(changedSkeleton);
    }

    // Sets limbs rotation to control target rotation
    limbsFollowRotation()
    {
        let chainObjects = this.chainObjectsValues;
        for(let i = 0; i < chainObjects.length; i++)
        {
            let joints = chainObjects[i].chain.joints;
            let bone = joints[joints.length -1].bone;
            let target = this.getTargetForSolve();
            let controlTarget = chainObjects[i].controlTarget
            let boneTarget = controlTarget.target;
            if((target && boneTarget.uuid !== target.uuid))
            {
              continue;
            }
            if(controlTarget.isRotationLocked)
            {
                this.rotateBoneQuaternion(bone, boneTarget);   
                bone.updateMatrix();
                bone.updateMatrixWorld(true, true); 
            }
        }
    }

    // Sets and quaternion angle for bones
    // Give the result of bone always faces direction set by euler
    // Affected by hips rotation
    // Effect like flat foot to earth can be achieved
    rotateBoneQuaternion(bone, boneTarget)
    {
        let targetQuat = this.resourceManager.getQuaternion();
        boneTarget.getWorldQuaternion(targetQuat);
        let quaternion = this.resourceManager.getQuaternion();
        bone.parent.getWorldQuaternion(quaternion).inverse();
        bone.quaternion.copy(quaternion);
        bone.quaternion.multiply(targetQuat);
        this.resourceManager.release(targetQuat);
        this.resourceManager.release(quaternion);
    }
    //#endregion
    takeBoneInTheMeshSpace(mesh, bone, boneMatrix)
    {
        let armatureInverseMatrixWorld = this.resourceManager.getMatrix4();
        armatureInverseMatrixWorld.getInverse(mesh.skeleton.bones[0].parent.matrixWorld);
        boneMatrix.multiplyMatrices(armatureInverseMatrixWorld, bone.matrixWorld);
        this.resourceManager.release(armatureInverseMatrixWorld);
    }
}

const interpretatedPoleTargetsName = name =>
{
    switch(name)
    {
        case "leftArmPole":
            return "LeftHand";
        case "rightArmPole":
            return "RightHand";
        case "leftLegPole":
            return "LeftFoot";
        case "rightLegPole":
            return "RightFoot";
    }
}

module.exports =  Ragdoll;
