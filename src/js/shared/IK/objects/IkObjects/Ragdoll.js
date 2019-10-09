const {IK}  = require("../../core/three-ik");
const IkObject = require( "./IkObject");
const THREE = require( "three");
const PoleConstraint = require( "../../constraints/PoleConstraint");
const PoleTarget = require( "../PoleTarget");
const CopyRotation = require( "../../constraints/CopyRotation");
const RagdollEvents = require( "./RagdollEvents");
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
    initObject(scene, object, controlTargets, poleTargets )
    {
        super.initObject(scene, object, controlTargets );
        
        this.ragdollEvents = new RagdollEvents(this);
        this.controlTargetSelection.initialize();
        // Adds events to Back control
        this.createPoleTargets(poleTargets);
        //this.ragdollEvents.addHipsEvent();
       // this.ragdollEvents.setUpControlsEvents();
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
        super.update();
        if(IK.firstRun)
        {
            IK.firstRun = false;
        }
        if(!this.isEnabledIk)
        {
       /*      if(this.hipsControlTarget.control.mode === "rotate" && this.attached)
            {
                this.updateCharacterRotation(this.originalObject.children[0].name, this.hipsControlTarget.target.rotation)
            }
            for(let i = 1; i < 5; i++) 
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
            } */
        
            this.ikSwitcher.applyToIk();
            //this.resetTargets()
            this.resetControlPoints();
            this.moveRagdoll();
            this.setUpControlTargetsInitialPosition();
        }
        else
        {
            if(this.applyingOffset)
            {
                //this.resetPoleTarget();
            }
            this.limbsFollowRotation();
            this.ikSwitcher.applyChangesToOriginal();
            //this.updateReact();
        }
    }

    // Runs after update to apply changes to object after ik solved
    lateUpdate()
    {
        super.lateUpdate();
        if(this.hipsMouseDown)
        {
            let parent = this.hipsControlTarget.target.parent;
            let hipsTarget = this.hipsControlTarget.target;
            let targetPosition = hipsTarget.worldPosition();
            let targetPos = hipsTarget.worldPosition();
            //this.scene.parent.parent.attach(this.hipsControlTarget.target);

            targetPos.sub(this.objectTargetDiff);
            this.clonedObject.position.copy(targetPos);
            this.clonedObject.updateMatrixWorld(true);
            
            this.hips.parent.worldToLocal(targetPosition);
            this.hips.position.copy(targetPosition);
            this.hips.updateMatrix();
            this.originalObject.position.copy(this.clonedObject.position);
            //parent.attach(this.hipsControlTarget.target);
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
            //chain.joints[chain.joints.length - 1].bone.getWorldPosition(chainObjects[i].controlTarget.target.position);

/*             let poleConstraints = this.chainObjects[i].poleConstraint;
            if(poleConstraints != null)
            {
                let targetPosition = new THREE.Vector3();
                chain.joints[chain.joints.length - 2].bone.getWorldPosition(targetPosition);
                let polePosition = poleConstraints.poleTarget.mesh.position;
                poleConstraints.poleTarget.mesh.position.set(targetPosition.x + polePosition.x, targetPosition.y + polePosition.y, targetPosition.z + polePosition.z);
                let poleTarget = poleConstraints.poleTarget;
                this.calculatePoleTargetOffset(poleTarget, chain);
                poleTarget.initialize(poleTarget.poleOffset);
            } */
            chain.reinitializeJoints();
        }
        this.resetControlPoints();
        this.calculteBackOffset();
        let hipsTarget = this.hipsControlTarget.target;

        hipsTarget.applyMatrix(this.rigMesh.skeleton.bones[0].parent.matrixWorld);
        let hipsWP = hipsTarget.position.clone();
        hipsTarget.applyMatrix(this.rigMesh.skeleton.bones[0].parent.getInverseMatrixWorld());
        let originalObjectWp = this.originalObject.position.clone();
        //this.objectTargetDiff = new THREE.Vector3().subVectors(hipsTarget.position, this.originalObject.position);
        this.objectTargetDiff = new THREE.Vector3().subVectors(hipsWP, originalObjectWp);
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
                 //scene.remove(constraint.poleTarget.mesh);
             }
         });
         //this.ragdollEvents.removeHipsEvent();
        // this.ragdollEvents.removeControlsEvents();
    }

    // Selects/Deselects ragdoll and adds/removes it's elements to/from scene

    // Moves ragdoll hips when original object moved
    moveRagdoll()
    {
        this.originalObject.matrixWorld.decompose(  this.clonedObject.position,  this.clonedObject.quaternion,  this.clonedObject.scale );
        //this.clonedObject.updateMatrixWorld(true, true);
    }
    //#endregion

    //#region Internal methods

    createPoleTargets(poleTargetMeshes)
    {
        let polePositions = {
            "LeftHand": new THREE.Vector3(0.3, 0.7, -0.5),
            "RightHand": new THREE.Vector3(-0.3, 0.7, -0.5),
            "LeftFoot": new THREE.Vector3(0, 0.4, 0.6),
            "RightFoot": new THREE.Vector3(0, 0.4, 0.6)
        };

        let chainObjects = this.chainObjectsValues;
        let backChain = this.chainObjects["Head"].chain;     
        for(let i = 0; i < poleTargetMeshes.length; i++)
        {
            let poleTargetMesh = poleTargetMeshes[i];
            let chainName = interpretatedPoleTargetsName(poleTargetMesh.name);
            let chain = this.chainObjects[chainName].chain;
            let poleTarget = null;
            if(poleTargetMesh.userData.isInitialized)
            {
                poleTarget = new PoleTarget();
                poleTarget.mesh = poleTargetMesh;
            }
            else
            {
                poleTarget = this.initPoleTargets(chain, polePositions[chainName], poleTargetMesh);
            }
            let poleConstraint = new PoleConstraint(chain, poleTarget);
            chain.joints[0].addIkConstraint(poleConstraint);
            chainObjects[i].poleConstraint = poleConstraint;
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
        //poleTarget.mesh.scale.set(10, 10, 10);
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
        let hipsOffset = position.clone().sub(this.hips.worldPosition());
        hipsOffset.add(this.hipsControlTarget.target.position);
        hipsOffset.add(offset);
        poleTarget.poleOffset = hipsOffset;
    }

    changeControlPointsParent(parent, needUpdate = true)
    {
        //console.log("changed parent to", parent)
        let chainObjects = this.chainObjectsValues;
        parent.attach(this.hipsControlTarget.target)
       // this.hipsControlTarget.target.needsUpdate = needUpdate;
        for(let i = 0; i < chainObjects.length; i++)
        {
            parent.attach(chainObjects[i].controlTarget.target);

           // chainObjects[i].controlTarget.target.needsUpdate = needUpdate;
           // chainObjects[i].controlTarget.target.updateMatrixWorld();
        }
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


    setUpControlTargetsInitialPosition()
    {
        let chainObjects = this.chainObjectsValues;
        for(let i = 0; i < chainObjects.length; i++)
        {
            let joints = chainObjects[i].chain.joints;
            let bone = joints[joints.length-1].bone;
            let target = chainObjects[i].controlTarget.target;
            target.quaternion.copy(bone.worldQuaternion().premultiply(this.hips.worldQuaternion().inverse()));
            target.localQuaternion = bone.parent.worldToLocalQuaternion(bone.worldQuaternion());
            // target.inverseInitialQuaternion = bone.worldQuaternion().inverse().multiply(this.hips.worldQuaternion());
            this.controlTargets[i].isRotationLocked = true;
        }
        this.poseChanged = true;
    }

    // Resets targets position
    // After ik has been turned off and on resets
    // pole position with consideration of offset
    resetTargets()
    {
        super.resetTargets();
        //this.resetPoleTarget();
    }

    resetControlPoints()
    {
        let chainObjects = this.chainObjectsValues;
        boneMatrix = takeBoneInTheMeshSpace(this.rigMesh, this.hips);
        this.hipsControlTarget.target.position.setFromMatrixPosition(boneMatrix);
        for(let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i].chain;
            let jointBone = chain.joints[chain.joints.length - 1].bone;
            boneMatrix = takeBoneInTheMeshSpace(this.rigMesh, jointBone);
            chainObjects[i].controlTarget.target.position.setFromMatrixPosition(boneMatrix);
            //chainObjects[i].controlTarget.control.position.setFromMatrixPosition(boneMatrix);
        }
        this.calculteBackOffset();
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
        let chainObjects = this.chainObjectsValues;
        for(let i = 0; i < chainObjects.length; i++)
        {
            let joints = chainObjects[i].chain.joints;
            let bone = joints[joints.length -1].bone;

            let target = this.getTargetForSolve();
            let controlTarget = chainObjects[i].controlTarget.target;
            if((target && controlTarget.uuid !== target.uuid))
            {
              continue;
            }
            this.rotateBoneQuaternion(bone, controlTarget);   
            bone.updateMatrix();
            bone.updateMatrixWorld(true, true); 
      /*       else
            {
                let followBone = originalbones[this.originalObjectTargetBone[i]];
                let targetQuat = boneTarget.worldQuaternion();
                let quaternion = bone.worldQuaternion().inverse();
                let rotation = followBone.worldQuaternion();
                bone.quaternion.multiply(quaternion);
                targetQuat.premultiply(boneTarget.inverseInitialQuaternion);
                targetQuat.premultiply(rotation);
                bone.quaternion.multiply(targetQuat);
            } */

        }
    }

    // Sets and quaternion angle for bones
    // Give the result of bone always faces direction set by euler
    // Affected by hips rotation
    // Effect like flat foot to earth can be achieved
    rotateBoneQuaternion(bone, boneTarget)
    {
        let targetQuat = boneTarget.worldQuaternion();
        let quaternion = bone.worldQuaternion().inverse();
        bone.quaternion.multiply(quaternion);
        bone.quaternion.multiply(targetQuat);
    }
    //#endregion
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

let boneMatrix = new THREE.Matrix4();
let tempMatrix = new THREE.Matrix4();
let armatureInverseMatrixWorld = new THREE.Matrix4();

const takeBoneInTheMeshSpace = (mesh, bone) =>
{
    armatureInverseMatrixWorld = mesh.skeleton.bones[0].parent.getInverseMatrixWorld();
    tempMatrix.multiplyMatrices(armatureInverseMatrixWorld, bone.matrixWorld);
    return tempMatrix;
}

module.exports =  Ragdoll;
