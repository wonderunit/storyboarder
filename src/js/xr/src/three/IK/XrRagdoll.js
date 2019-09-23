const {IK}  = require("../../../../shot-generator/IK/core/three-ik");
const XRIKObject = require( "./XrIkObject");
const THREE = require( "three");
const PoleConstraint = require( "../../../../shot-generator/IK/constraints/PoleConstraint");
const PoleTarget = require( "../../../../shot-generator/IK/objects/PoleTarget");
const CopyRotation = require( "../../../../shot-generator/IK/constraints/CopyRotation");
require("../../../../shot-generator/IK/utils/Object3dExtension");
//const {calculatePoleAngle, normalizeTo180} = require("../../utils/axisUtils");
// Ragdoll is class which is used to set all specific details to ikrig
// Like head upward, contraints to limb, transformControls events etc.
class XRRagdoll extends XRIKObject
{
    constructor()
    {
        super();
        this.hipsMouseDown = false;
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
    initObject(scene, object, controlTargets )
    {
        super.initObject(scene, object, controlTargets );
        
        //this.ragdollEvents = new RagdollEvents(this);
        // Adds events to Back control
        //this.ragdollEvents.applyEventsToBackControl(this.controlTargets[0].control);
        this.createPoleTargets();
     /*    this.ragdollEvents.addHipsEvent();
        this.ragdollEvents.setUpControlsEvents(); */
        this.setUpControlTargetsInitialPosition();

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
        //this.resetTargets();
        super.update();
        if(IK.firstRun)
        {
            IK.firstRun = false;
        }
        if(!this.isEnabledIk)
        {
            //if(this.hipsControlTarget.mode === "rotate" && this.attached)
            {
                //this.updateCharacterRotation(this.originalObject.children[0].name, this.hipsControlTarget.rotation)
            }
/*             for(let i = 1; i < 5; i++) 
            {
                let chainObject = this.chainObjects[i];
                let joints = chainObject.chain.joints;
                let currentBone = joints[0].bone;
                //if(joints  && (currentBone.isRotationChanged || this.poseChanged))
                //{
                //    let poleConstraint = chainObject.poleConstraint;
                //    let angle = calculatePoleAngle(currentBone, joints[joints.length - 1].bone, poleConstraint.poleTarget.mesh, joints[0]);
                //    angle *= THREE.Math.RAD2DEG;
                //    //angle = normalizeTo180(angle);
    //
                //    //poleConstraint.poleAngle = 0;
                //    this.poseChanged = false;
                //    currentBone.isRotationChanged = false;
                //    let result = this.originalObject.children[1].skeleton.bones.filter(bone => bone.name === currentBone.name)[0];
                //    result.isRotationChanged = false;
                //}
            }
         */
        this.ikSwitcher.applyToIk();
        this.resetTargets()
           // this.ikSwitcher.applyToIk();
        }
        else
        {
            if(this.applyingOffset)
            {
                this.resetPoleTarget();
            }
            this.limbsFollowRotation();
            this.ikSwitcher.applyChangesToOriginal();
            //this.updateReact();
            this.relativeFixedAngle();
        }
        
        this.moveRagdoll();
    }

    // Runs after update to apply changes to object after ik solved
    lateUpdate()
    {
        super.lateUpdate();
        if(this.hipsMouseDown)
        {
            let hipsTarget = this.hipsControlTarget;
            let targetPosition = hipsTarget.position.clone();
            let targetPos = hipsTarget.position.clone();
            
            targetPos.sub(this.objectTargetDiff);
            this.clonedObject.position.copy(targetPos);
            this.clonedObject.updateMatrix();
            this.clonedObject.updateMatrixWorld(true);
            
            this.hips.parent.worldToLocal(targetPosition);
            this.hips.position.copy(targetPosition);
            this.hips.updateMatrix();
            this.originalObject.position.copy(this.clonedObject.position);
            //this.updateCharPosition(this.clonedObject.position);
        }
    }

    // Reintializes whole body and ik joints when character was changed
    // Changing character height, head size will fire reinitialization
    reinitialize()
    {    
        let chainObjects = this.chainObjects;
        this.clonedObject.scale.copy(this.originalObject.scale);
        this.clonedObject.position.copy(this.originalObject.position);
        this.clonedObject.updateMatrixWorld(true);
        for(let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i].chain;
            chain.joints[chain.joints.length - 1].bone.getWorldPosition(chainObjects[i].controlTarget.position);

            let poleConstraints = this.chainObjects[i].poleConstraint;
            if(poleConstraints != null)
            {
                let targetPosition = new THREE.Vector3();
                chain.joints[chain.joints.length - 2].bone.getWorldPosition(targetPosition);
                let polePosition = poleConstraints.poleTarget.mesh.position;
                poleConstraints.poleTarget.mesh.position.set(targetPosition.x + polePosition.x, targetPosition.y + polePosition.y, targetPosition.z + polePosition.z);
                let poleTarget = poleConstraints.poleTarget;
                this.calculatePoleTargetOffset(poleTarget, chain);
                poleTarget.initialize(poleTarget.poleOffset);
            }
            chain.reinitializeJoints();
        }
        this.hips.getWorldPosition(this.hipsControlTarget.position);
        this.calculteBackOffset();
        this.ikSwitcher.applyToIk();
        let hipsTarget = this.hipsControlTarget;
        this.objectTargetDiff = new THREE.Vector3().subVectors(hipsTarget.position, this.originalObject.position);
        this.setUpControlTargetsInitialPosition();
    }

    // Moves ragdoll hips when original object moved
    moveRagdoll()
    {
        this.clonedObject.position.copy(this.originalObject.position);
        this.clonedObject.updateMatrixWorld(true, true);
    }
    //#endregion

    //#region Internal methods

    createPoleTargets()
    {
        let poleNames = ["leftArmPole", "rightArmPole", "leftLegPole", "rightLegPole"];
        let polePositions = [
            new THREE.Vector3(0.3, 1, 0.5),
            new THREE.Vector3(-0.3, 1, 0.5),
            new THREE.Vector3(0, 0.4, 0.8),
            new THREE.Vector3(0, 0.4, 0.8)
        ];
        let backChain = this.ik.chains[0];        
        for(let i = 1; i < 5; i++)
        {
            let chain = this.ik.chains[i];
            let poleTarget = this.initPoleTargets(chain, polePositions[i-1], poleNames[i-1]);
            let poleConstraint = new PoleConstraint(chain, poleTarget);
            chain.joints[0].addIkConstraint(poleConstraint);
            this.chainObjects[i].poleConstraint = poleConstraint;
        }
    
        let copyRotation = new CopyRotation(backChain, backChain.joints[4]);
        copyRotation.influence = 50;
        backChain.joints[3].addIkConstraint(copyRotation);
        
    }

    // Initiallizes pole target for pole contraints
    initPoleTargets(chain, offset, name)
    {
        let poleTarget = new PoleTarget();
        poleTarget.initialOffset = offset;
        this.calculatePoleTargetOffset(poleTarget, chain);
        poleTarget.initialize(poleTarget.poleOffset);
        poleTarget.name = name;
    
        return poleTarget;
    }

    // Calculates offset of pole target position
    // take in consideration current hips
    // so pole target binded to hips 
    calculatePoleTargetOffset(poleTarget, chain)
    {
        let offset = poleTarget.initialOffset;
        let position = chain.joints[chain.joints.length - 2].bone.worldPosition();
        let hipsOffset = position.clone().sub(this.hips.worldPosition());
        hipsOffset.add(this.hips.position);
        hipsOffset.add(offset);
        poleTarget.poleOffset = hipsOffset;
    }

    // Resets pole target position when object moved his hips position changed
    resetPoleTarget()
    {
         let chainObjects = this.chainObjects;
         let hipsTarget = this.hipsControlTarget;
         let {angle, axis} = this.hips.quaternion.toAngleAxis();
         let spineWorldQuat = this.hips.children[0].children[0].children[0].worldQuaternion();
         let armsAngleAxis = spineWorldQuat.toAngleAxis();
         for(let i = 0; i < chainObjects.length; i++)
         {
             let constraint = this.chainObjects[i].poleConstraint;
             if(!constraint)
             {
                 continue;
             }
             let targetPosition = new THREE.Vector3();
             hipsTarget.getWorldPosition(targetPosition);
             let poleOffset = constraint.poleTarget.poleOffset;
             let mesh = constraint.poleTarget.mesh;
             mesh.position.set(targetPosition.x + poleOffset.x, targetPosition.y + poleOffset.y, targetPosition.z + poleOffset.z);
             if(constraint.poleTarget.mesh.name === "leftArmPole" || constraint.poleTarget.mesh.name === "rightArmPole")
             {
                 mesh.rotateAroundPoint(targetPosition, armsAngleAxis.axis, armsAngleAxis.angle);
             }
             else
             {
                 mesh.rotateAroundPoint(targetPosition, axis, angle);
             }
         }
    }


    setUpControlTargetsInitialPosition()
    {
        for(let i = 0; i < this.chainObjects.length; i++)
        {
            let joints = this.ik.chains[i].joints;
            let bone = joints[joints.length-1].bone;
            let target = this.controlTargets[i];
            target.quaternion.copy(bone.worldQuaternion().premultiply(this.hips.worldQuaternion().inverse()));
            target.inverseInitialQuaternion = bone.worldQuaternion().inverse().multiply(this.hips.worldQuaternion());
            target.localQuaternion = bone.parent.worldToLocalQuaternion(bone.worldQuaternion());
        }
        this.controlTargets[0].isRotationLocked = true;
        this.controlTargets[3].isRotationLocked = true;
        this.controlTargets[4].isRotationLocked = true;
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
        this.resetPoleTarget();
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
                targetQuat.premultiply(boneTarget.inverseInitialQuaternion);
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
        let rotation = this.originalObject.children[0].worldQuaternion();
        bone.quaternion.multiply(quaternion);
        targetQuat.premultiply(rotation);

        bone.quaternion.multiply(targetQuat);
    }
    //#endregion
}
module.exports =  XRRagdoll;
