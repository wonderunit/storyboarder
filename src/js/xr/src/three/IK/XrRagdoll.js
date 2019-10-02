const {IK}  = require("../../../../shot-generator/IK/core/three-ik");
const XRIKObject = require( "./XrIkObject");
const THREE = require( "three");
const XrPoleConstraint = require( "./Constraints/XrPoleConstraint");
const PoleTarget = require( "../../../../shot-generator/IK/objects/PoleTarget");
const CopyRotation = require( "../../../../shot-generator/IK/constraints/CopyRotation");
require("../../../../shot-generator/IK/utils/Object3dExtension");
// Ragdoll is class which is used to set all specific details to ikrig
// Like head upward, contraints to limb, transformControls events etc.
let boneMatrix = new THREE.Matrix4();
let tempMatrix = new THREE.Matrix4();
let armatureInverseMatrixWorld = new THREE.Matrix4();
let reusableVector = new THREE.Vector3();
let reusableQuaternion = new THREE.Quaternion();
const takeBoneInTheMeshSpace = (mesh, bone) =>
{
    armatureInverseMatrixWorld = mesh.skeleton.bones[0].parent.getInverseMatrixWorld();
    tempMatrix.multiplyMatrices(armatureInverseMatrixWorld, bone.matrixWorld);
    return tempMatrix;
}
class XRRagdoll extends XRIKObject
{
    constructor()
    {
        super();

        this.poseChanged = false;
        this.controlTargetSelection = null;
        this.updatingReactPosition = [];
        this.originalObjectTargetBone = [];
        this.originalObjectTargetBone.push(4);
        this.originalObjectTargetBone.push(11);
        this.originalObjectTargetBone.push(35);
        this.originalObjectTargetBone.push(58);
        this.originalObjectTargetBone.push(63);
    }
    
    //#region External Methods
    // Initializes ragdoll set up all neccessary information 
    initObject(scene, object, controlTargets, poleTargets )
    {
        super.initObject(scene, object, controlTargets );
        this.createPoleTargets(poleTargets);
    }

    updateSkeleton(updateCharacterSkeleton)
    {
        this.updateCharacterSkeleton = updateCharacterSkeleton;
    }

    updateCharacterPos(updateCharPosition)
    {
        this.updateCharPosition = updateCharPosition;
    }

    updateCharacterRotation(updateCharacterRotation)
    {
        this.updateCharacterRotation = updateCharacterRotation;
    }

    // Runs cycle which is updating object
    update()
    {
        super.update();
        if(IK.firstRun)
        {
            IK.firstRun = false;
        }
        if(!this.isEnabledIk)
        {
            if(this.hipsControlTarget.mode === "rotate" && this.attached)
            {
                this.updateCharacterRotation(this.originalObject.children[0].name, this.hipsControlTarget.rotation)
            }
            this.ikSwitcher.applyToIk();
            this.resetControlPoints();
            this.moveRagdoll();
            this.setUpControlTargetsInitialPosition();
        }
        else
        {
            //this.resetControlPoints();
            this.limbsFollowRotation();
            this.ikSwitcher.applyChangesToOriginal();
            this.relativeFixedAngle();
        }
    }

    // Runs after update to apply changes to object after ik solved
    lateUpdate()
    {
        super.lateUpdate();
        if(this.hipsMouseDown)
        {
            let hipsTarget = this.hipsControlTarget;
            let targetPosition = hipsTarget.worldPosition();            
            let targetPos = this.hipsControlTarget.worldPosition();
            
            targetPos.sub(this.objectTargetDiff);
            this.clonedObject.position.copy(targetPos);
            this.clonedObject.updateMatrixWorld(true); 
            
            this.hips.parent.worldToLocal(targetPosition);
            this.hips.position.copy(targetPosition);
            this.hips.updateMatrix();
            this.originalObject.position.copy(this.clonedObject.position);
        }
    }

    // Reintializes whole body and ik joints when character was changed
    // Changing character height, head size will fire reinitialization
    reinitialize()
    {    
        let chainObjects = this.chainObjects;
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
        this.ikSwitcher.applyToIk();
        let hipsTarget = this.hipsControlTarget;

        hipsTarget.applyMatrix(this.rigMesh.skeleton.bones[0].parent.matrixWorld);
        let hipsWP = hipsTarget.position.clone();
        //hipsTarget.parent.localToWorld(hipsWP)
        hipsTarget.applyMatrix(this.rigMesh.skeleton.bones[0].parent.getInverseMatrixWorld());

        let originalObjectWp = this.originalObject.position.clone();
        this.objectTargetDiff = new THREE.Vector3().subVectors(hipsWP, originalObjectWp);
    }

    // Moves ragdoll hips when original object moved
    moveRagdoll()
    {
        this.originalObject.matrixWorld.decompose(  this.clonedObject.position,  this.clonedObject.quaternion,  this.clonedObject.scale );
    }
    //#endregion

    //#region Internal methods

    createPoleTargets(poleTargetMeshes)
    {
        let polePositions = {
            "leftArmPole": new THREE.Vector3(0.3, 0.7, -0.5),
            "rightArmPole": new THREE.Vector3(-0.3, 0.7, -0.5),
            "leftLegPole": new THREE.Vector3(0, 0.4, 0.6),
            "rightLegPole": new THREE.Vector3(0, 0.4, 0.6)
        };

        let leftArmPole = poleTargetMeshes.find(point => point.name === "leftArmPole");
        let rightArmPole = poleTargetMeshes.find(point => point.name === "rightArmPole");
        let leftLegPole = poleTargetMeshes.find(point => point.name === "leftLegPole");
        let rightLegPole = poleTargetMeshes.find(point => point.name === "rightLegPole");
        let poleMeshes = [leftArmPole, rightArmPole, leftLegPole, rightLegPole];
        let backChain = this.ik.chains[0];        
        for(let i = 1; i < 5; i++)
        {
            let poleTargetMesh = poleMeshes[i - 1];
            let chain = this.ik.chains[i];
            let poleTarget = null;
            if(poleTargetMesh.userData.isInitialized)
            {
                poleTarget = new PoleTarget();
                poleTarget.mesh = poleTargetMesh;
            }
            else
            {
                poleTarget = this.initPoleTargets(chain, polePositions[poleTargetMesh.name], poleTargetMesh);
            }
            let poleConstraint = new XrPoleConstraint(chain, poleTarget);
            chain.joints[0].addIkConstraint(poleConstraint);
            this.chainObjects[i].poleConstraint = poleConstraint;
        }
    
        let copyRotation = new CopyRotation(backChain, backChain.joints[4]);
        copyRotation.influence = 50;
        backChain.joints[3].addIkConstraint(copyRotation);
        
    }

    // Initiallizes pole target for pole contraints
    initPoleTargets(chain, offset, poleTargetMesh)
    {
        let poleTarget = new PoleTarget();
        poleTarget.mesh = poleTargetMesh;
        poleTarget.initialOffset = offset.multiplyScalar(poleTargetMesh.userData.scaleAspect);
        this.calculatePoleTargetOffset(poleTarget, chain);
        poleTarget.initialize(poleTarget.poleOffset);
        
        return poleTarget;
    }

    // Calculates offset of pole target position
    // take in consideration current hips
    // so pole target binded to hips 
    calculatePoleTargetOffset(poleTarget, chain)
    {
        let offset = poleTarget.initialOffset;
        let position = chain.joints[chain.joints.length - 2].bone.worldPosition();
        let hipsOffset = position.clone().sub(this.hips.worldPosition())
        hipsOffset.add(this.hips.position);
        hipsOffset.add(offset);
        poleTarget.poleOffset = hipsOffset;
    }

    changeControlPointsParent(parent)
    {
        let chainObjects = this.chainObjects;
        for(let i = 0; i < chainObjects.length; i++)
        {
            parent.attach(chainObjects[i].controlTarget);
            chainObjects[i].controlTarget.updateMatrixWorld();
        }
    }

    resetControlPoints()
    {
        
        
        boneMatrix = takeBoneInTheMeshSpace(this.rigMesh, this.hips);
        this.hipsControlTarget.position.setFromMatrixPosition(boneMatrix);
        
        let chainObjects = this.chainObjects;
        for(let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i].chain;
            let jointBone = chain.joints[chain.joints.length - 1].bone;
            // Sets target position to ik last joints in each chain 
            if(jointBone.name === "LeftFoot" || jointBone.name === "RightFoot" ||
            jointBone.name === "LeftHand" || jointBone.name === "RightHand" ||
            jointBone.name === "Head")
            {
                boneMatrix = takeBoneInTheMeshSpace(this.rigMesh, jointBone);
                chainObjects[i].controlTarget.position.setFromMatrixPosition(boneMatrix);
            }
        }
        this.calculteBackOffset();
    }

    setUpControlTargetsInitialPosition()
    {
        for(let i = 0; i < this.chainObjects.length; i++)
        {
            let joints = this.ik.chains[i].joints;
            let bone = joints[joints.length-1].bone;
            let target = this.controlTargets[i];
            target.quaternion.multiply(target.worldQuaternion().inverse());
            target.quaternion.copy(bone.worldQuaternion().premultiply(this.hips.parent.worldQuaternion().inverse()));
            target.localQuaternion = bone.parent.worldToLocalQuaternion(bone.worldQuaternion());
            target.isRotationLocked = true;
        }
        this.relativeFixedAngle();
        this.poseChanged = true;
    }

    relativeFixedAngle()
    {
        this.relativeFixedAngleDelta = {};
        for(let i = 0; i < this.chainObjects.length; i++)
        {
            let joints = this.ik.chains[i].joints;
            let bone = joints[joints.length-1].bone;
            let controlTarget = this.chainObjects[i].controlTarget;
            let boneTarget = controlTarget;
            let inverseWorldQuaternion = bone.worldQuaternion().inverse();
            let quaternion =  bone.worldQuaternion();

            let targetQuat = boneTarget.worldQuaternion();

            let targetToObj = new THREE.Quaternion();
            targetToObj.multiply(targetQuat.inverse());
            targetToObj.multiply(quaternion);

            let objToTarget = new THREE.Quaternion();
            objToTarget.multiply(inverseWorldQuaternion);
            objToTarget.multiply(targetQuat);

            this.relativeFixedAngleDelta[i] = {};
    
            this.relativeFixedAngleDelta[i].targetToObject = targetToObj;
            this.relativeFixedAngleDelta[i].objectToTarget = objToTarget;
        }
    }

    // Resets targets position
    // After ik has been turned off and on resets
    // pole position with consideration of offset
    resetTargets()
    {
        super.resetTargets();
    }

    updateReact()
    {        
        let ikBones = [];
        for (let bone of this.originalObject.getObjectByProperty("type", "SkinnedMesh").skeleton.bones)
        {
            if(!this.ikSwitcher.ikBonesName.some((boneName) => bone.name === boneName ))
            {
                continue;
            }
            ikBones.push(bone);
        }
        this.updatingReactSkeleton = true;
        this.updateCharacterSkeleton(ikBones);
    }

    // Sets limbs rotation to control target rotation
    limbsFollowRotation()
    {
        let originalbones = this.clonedObject.getObjectByProperty("type", "SkinnedMesh").skeleton.bones;
        for(let i = 0; i < this.chainObjects.length; i++)
        {
            let joints = this.ik.chains[i].joints;
            let bone = joints[joints.length -1].bone;

            let controlTarget = this.chainObjects[i].controlTarget;
            let boneTarget = controlTarget;
            let target = this.getTargetForSolve();
            if((target && boneTarget.uuid !== target.uuid))
            {
              continue;
            }
            // Checks if rotation locked and apply rotation 
            if(controlTarget.isRotationLocked)
            {
                this.rotateBoneQuaternion(bone, boneTarget, originalbones[this.originalObjectTargetBone[i]]);   
            }
            else
            {
                let followBone = originalbones[this.originalObjectTargetBone[i]];
                let targetQuat = boneTarget.worldQuaternion();
                let quaternion = bone.worldQuaternion().inverse();
                let rotation = followBone.worldQuaternion();
                bone.quaternion.multiply(quaternion);
                targetQuat.premultiply(rotation);
                bone.quaternion.multiply(targetQuat);
            }
            bone.updateMatrix();
            bone.updateMatrixWorld(true, true);
        }
    }

    // Sets and quaternion angle for bones
    // Give the result of bone always faces direction set by euler
    // Affected by hips rotation
    // Effect like flat foot to earth can be achieved
    rotateBoneQuaternion(bone, boneTarget, followBone)
    {
        let targetQuat = boneTarget.worldQuaternion();
        let quaternion = bone.worldQuaternion().inverse();
        bone.quaternion.multiply(quaternion);
        bone.quaternion.multiply(targetQuat);
    }
    //#endregion
}
module.exports =  XRRagdoll;
