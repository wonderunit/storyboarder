const {IK}  = require("../../core/three-ik");
const IkObject = require( "./IkObject");
const THREE = require( "three");
const PoleConstraint = require( "../../constraints/PoleConstraint");
const PoleTarget = require( "../PoleTarget");
const CopyRotation = require( "../../constraints/CopyRotation");
require("../../utils/Object3dExtension");
const {calculatePoleAngle, normalizeTo180} = require("../../utils/axisUtils");
// Ragdoll is class which is used to set all specific details to ikrig
// Like head upward, contraints to limb, transformControls events etc.
class Ragdoll extends IkObject
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
 
        // Adds events to Back control
        this.applyEventsToBackControl(this.controlTargets[0].control);
        this.createPoleTargets();
        this.addHipsEvent();
        this.setUpControlEvents();
        this.setUpControlTargetsInitialPosition();
    }

    updateCharacter(updateChar)
    {
        this.updateChar = updateChar;
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
            if(this.hipsControlTarget.control.mode === "rotate" && this.attached)
            {
                this.updateCharacterRotation(this.originalObject.children[0].name, this.hipsControlTarget.target.rotation)
            }
            for(let i = 1; i < 5; i++) 
            {
                let chainObject = this.chainObjects[i];
                let joints = chainObject.chain.joints;
                let currentBone = joints[0].bone;
                if(joints && (currentBone.isRotationChanged || this.poseChanged))
                {
                    let angle = calculatePoleAngle(currentBone, joints[joints.length - 1].bone, chainObject.poleConstraint.poleTarget.mesh, joints[0]);
                    angle *= (180 / Math.PI);
                    angle = normalizeTo180(angle);
                    //chainObject.poleConstraint.poleAngle = angle;
                    this.poseChanged = false;
                    currentBone.isRotationChanged = false;
                    let result = this.originalObject.children[1].skeleton.bones.filter(bone => bone.name === currentBone.name)[0];
                    result.isRotationChanged = false;
                }
            }
        
            this.resetTargets()
            this.ikSwitcher.applyToIk();
        }
        else
        {
            this.limbsFollowRotation();
            this.ikSwitcher.applyChangesToOriginal();
            this.updateReact();
            this.relativeFixedAngle();
        }
    }

    // Runs after update to apply changes to object after ik solved
    lateUpdate()
    {
        super.lateUpdate();
        if(this.hipsMouseDown)
        {
            let hipsTarget = this.hipsControlTarget.target;
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
            this.updateCharPosition(this.clonedObject.position);
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
            chain.joints[chain.joints.length - 1].bone.getWorldPosition(chainObjects[i].controlTarget.target.position);

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
        this.hips.getWorldPosition(this.hipsControlTarget.target.position);
        this.calculteBackOffset();
        this.ikSwitcher.applyToIk();
        let hipsTarget = this.hipsControlTarget.target;
        this.objectTargetDiff = new THREE.Vector3().subVectors(hipsTarget.position, this.originalObject.position);
        this.setUpControlTargetsInitialPosition();
    }

    // Removes object and all it's meshes from scene
    removeFromScene()
     {
         let scene = this.scene;
         super.removeFromScene(scene);
         this.controlTargetSelection.dispose();
         this.chainObjects.forEach((chainObject)=>
         {
             let constraint = chainObject.poleConstraint;
             if(constraint)
             {
                 scene.remove(constraint.poleTarget.mesh);
             }
         });
    }

    // Selects/Deselects ragdoll and adds/removes it's elements to/from scene
    selectedSkeleton(selected)
    {
        let visible = selected;
        let chainObjects = this.chainObjects;
        for (let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i];
            if(visible)
            {
                chain.controlTarget.addToScene();
            }
            else
            {
                chain.controlTarget.removeFromScene();
            }
        }
        if(visible)
        {
            this.controlTargetSelection.initialize();
            this.hipsControlTarget.addToScene();
        }
        else
        {
            this.controlTargetSelection.dispose();
            this.hipsControlTarget.removeFromScene();
        }
    }

    // Moves ragdoll hips when original object moved
    moveRagdoll()
    {
        this.clonedObject.position.copy(this.originalObject.position);
        this.clonedObject.updateMatrixWorld(true, true);
    }
    //#endregion

    //#region Internal methods
    // Applies events to back control
    applyEventsToBackControl(backControl)
    {
        backControl.addEventListener("pointerdown", (event) =>
        {
            this.applyingOffset = true;
        });
        backControl.addEventListener("dragging-changed", (event) =>
        {
            this.calculteBackOffset();
        });
        backControl.addEventListener("pointerup", (event) =>
        {
            this.applyingOffset = false;
        });
    }

    createPoleTargets()
    {
        let poleNames = ["leftArmPole", "rightArmPole", "leftLegPole", "rightLegPole"];
        let polePositions = [
            new THREE.Vector3(0.3, 0.3, 0.5),
            new THREE.Vector3(-0.3, 0.3, 0.5),
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

    // Adds events to hips
    // Mainly is for controlling poleTarget position so it will follow hips
    // With taking offset between them into account
    addHipsEvent()
    {
        let hipsControl = this.hipsControlTarget.control;
 
        hipsControl.addEventListener("pointerdown", (event) =>
        {
            this.hipsMouseDown = true;
            this.isEnabledIk = true;
            if(this.hipsControlTarget.control.mode === "rotate")
            {
                this.isEnabledIk = false;
                this.attached = true;
                this.originalObject.children[0].isRotated = true;
            }
        });
        hipsControl.addEventListener("transformMoved", (event) =>
        {
            if(this.hipsMouseDown)
            {
                this.resetPoleTarget();
            }
        });
        hipsControl.addEventListener("dragging-changed", (event) =>
        {
            this.calculteBackOffset();
        });
        hipsControl.addEventListener("pointerup", (event) =>
        {
            if(this.attached)
            {
                this.attached = false;
                this.originalObject.children[0].isRotated = false;
            }
            this.applyingOffset = false;
            this.hipsMouseDown = false;
            this.isEnabledIk = false;
        });
    }

    // Resets pole target position when object moved his hips position changed
    resetPoleTarget()
     {
         let chainObjects = this.chainObjects;
         let hipsTarget = this.hipsControlTarget.target;
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

    // Sets up control event for mouse down and up to enable and disable ik on mouse click
    setUpControlEvents()
    {
        let chainObject = this.chainObjects;
        for (let i = 0; i < chainObject.length; i++)
        {
            let control = chainObject[i].controlTarget.control;
            let target = chainObject[i].controlTarget.target;
            control.addEventListener("pointerdown", (event) =>
            {
                this.isEnabledIk = true;
                target.isActivated = true;
                if(control.mode === "rotate")
                {
                    this.isRotation = true;
                }
            });

            control.addEventListener("pointerup", (event) =>
            {
                target.isActivated = false;
                this.isRotation = false;
                this.isEnabledIk = false;
            });
        }
    }

    setUpControlTargetsInitialPosition()
    {
        for(let i = 0; i < this.chainObjects.length; i++)
        {
            let joints = this.ik.chains[i].joints;
            let bone = joints[joints.length-1].bone;
            let target = this.controlTargets[i].target;
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
            let boneTarget = controlTarget.target;
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
        for (let bone of this.originalObject.children[1].skeleton.bones)
        {
            if(!this.ikSwitcher.ikBonesName.some((boneName) => bone.name === boneName ))
            {
                continue;
            }
            ikBones.push(bone);
        }
        this.updatingReactSkeleton = true;
        this.updateChar(ikBones);
    }

    // Sets limbs rotation to control target rotation
    limbsFollowRotation()
    {
        let originalbones = this.clonedObject.children[1].skeleton.bones;
        for(let i = 0; i < this.chainObjects.length; i++)
        {
            let joints = this.ik.chains[i].joints;
            let bone = joints[joints.length -1].bone;

            let controlTarget = this.chainObjects[i].controlTarget;
            let boneTarget = controlTarget.target;
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
module.exports =  Ragdoll;
