const {IK}  = require("../../core/three-ik");
const IkObject = require( "./IkObject");
const THREE = require( "three");
const PoleConstraint = require( "../../constraints/PoleConstraint");
const PoleTarget = require( "../PoleTarget");
const CopyRotation = require( "../../constraints/CopyRotation");
const ControlTargetSelection = require( "../ControlTargetSelection");
require("../../utils/Object3dExtension");
// Ragdoll is class which is used to set all specific details to ikrig
// Like head upward, feet downward etc.
class Ragdoll extends IkObject
{
    constructor()
    {
        super();
        this.scene = null;
        this.hipsMouseDown = false;
        this.isInitialized = false;
        this.poleConstraints = [];
        this.controlTargetSelection = null;
        this.updatingReactPosition = [];
        this.originalObjectTargetBone = [];
        this.originalObjectTargetBone.push(4);
        this.originalObjectTargetBone.push(11);
        this.originalObjectTargetBone.push(35);
        this.originalObjectTargetBone.push(58);
        this.originalObjectTargetBone.push(63);

        this.originalData = {};
    }

    // Initializes ragdoll set up all neccessary information 
    initObject(scene, object, ...controlTarget )
    {
        super.initObject(scene, object, controlTarget );

        // Adds events to Back control
        this.applyEventsToBackControl(this.controlTargets[0].control);
        this.scene = scene;
        let backChain = this.ik.chains[0];
        let leftArmChain = this.ik.chains[1];
        let rightArmChain = this.ik.chains[2];
        let leftLegChain = this.ik.chains[3];
        let rightLegChain = this.ik.chains[4];

        let leftArmPoleTarget = this.initPoleTargets(leftArmChain, new THREE.Vector3(0, 0, -0.5), "leftArmPole");
        let leftLegPoleTarget = this.initPoleTargets(leftLegChain, new THREE.Vector3(0, 0.4, 0.8), "leftLegPole");
        let rightArmPoleTarget = this.initPoleTargets(rightArmChain, new THREE.Vector3(0, 0, -0.5), "rightArmPole");
        let rightLegPoleTarget = this.initPoleTargets(rightLegChain, new THREE.Vector3(0, 0.4, 0.8), "rightLegPole");
        let backPoleTarget =  this.initPoleTargets(backChain, new THREE.Vector3(0, 0, 0), "backPole");

        let poleConstraint = new PoleConstraint(backChain, backPoleTarget);
        this.poleConstraints.push(poleConstraint);
        this.addPoleConstraintToRootJoint(leftArmChain, leftArmPoleTarget);
        this.addPoleConstraintToRootJoint(rightArmChain, rightArmPoleTarget);
        this.addPoleConstraintToRootJoint(leftLegChain, leftLegPoleTarget);
        this.addPoleConstraintToRootJoint(rightLegChain, rightLegPoleTarget);

        let copyRotation = new CopyRotation(backChain, backChain.joints[4]);
        copyRotation.influence = 50;
        backChain.joints[3].addIkConstraint(copyRotation);

        this.poleConstraints[0].poleAngle = 128;
        this.poleConstraints[0].chainLength = 6;
        this.addHipsEvent();
        this.setUpControlEvents();
       
        this.isInitialized = true; 
        this.setUpControlTargetsInitialPosition();
    }

    // Set control target selection
    setControlTargetSelection(domElement, scene, camera)
    {
        this.controlTargetSelection = new ControlTargetSelection(domElement, scene, camera, this.controlTargets);
    }

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

    // Initiallizes pole target for pole contraints
    initPoleTargets(chain, offset, name)
    {
        let poleTarget = new PoleTarget();
        poleTarget.initialOffset = offset;
        this.calculatePoleTargetOffset(poleTarget, chain);
        poleTarget.initialize(poleTarget.poleOffset);
        poleTarget.name = name;
        poleTarget.mesh.visible = true;
    
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

    // Add pole contstraints to root joint of chains
    addPoleConstraintToRootJoint(chain, poleTarget)
    {
        let poleConstraint = new PoleConstraint(chain, poleTarget);
        chain.joints[0].addIkConstraint(poleConstraint);
        this.poleConstraints.push(poleConstraint);
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
            this.applyingOffset = false;
            this.hipsMouseDown = false;
            this.isEnabledIk = false;
        });
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

    updateCharacter(updateChar)
    {
        this.updateChar = updateChar;
    }

    updateCharacterPos(updateCharPosition)
    {
        this.updateCharPosition = updateCharPosition;
    }

    // Runs cycle which is updating object
    update()
    {
        if(!this.isInitialized)
        {
            return;
        }
        super.update();
        if(IK.firstRun)
        {
            //this.setUpControlTargetsInitialPosition();
            IK.firstRun = false;
        }
        if(!this.isEnabledIk)
        {
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
            if(target && boneTarget.uuid !== target.uuid)
            {
              continue;
            }
            // Checks if rotation locked and apply rotation 
            if(controlTarget.isRotationLocked)
            {
                this.rotateBoneQuaternion(bone, boneTarget, originalbones[this.originalObjectTargetBone[i]], this.relativeFixedAngleDelta[i] );
            }
            else
            {
                let localQuat = bone.parent.worldToLocalQuaternion(boneTarget.worldQuaternion());
                if(boneTarget.prevQuat)
                {
                    bone.quaternion.multiply(boneTarget.prevQuat.inverse());
                }
                bone.quaternion.multiply(localQuat);
                boneTarget.prevQuat = localQuat;
            }
            bone.updateMatrix();
            bone.updateMatrixWorld(true, true);
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
            
            //this.scene.worldToLocal(diff);
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

    // Sets and quaternion angle for bones
    // Give the result of bone always faces direction set by euler
    // Affected by hips rotation
    // Effect like flat foot to earth can be achieved
    rotateBoneQuaternion(bone, boneTarget, followBone, delta)
    {
        let targetQuat = boneTarget.worldQuaternion();
        let quaternion = bone.worldQuaternion().inverse();
        let rotation = this.originalObject.children[0].worldQuaternion();
        //targetQuat.premultiply(this.originalObject.quaternion);
        targetQuat.premultiply(rotation);
        quaternion.multiply(targetQuat);
        bone.quaternion.multiply(quaternion);

       //let targetQuat = boneTarget.worldQuaternion();
       //let inverseWorld = bone.worldQuaternion().conjugate();
       //let quaternion = inverseWorld.clone();
       //if(followBone.name === "LeftLeg")
       //{
       //    console.log(followBone.rotation);
       //}
       //let rotation = followBone.worldQuaternion().inverse();
       ////targetQuat.premultiply(this.originalObject.quaternion);
       //let newQuat = new THREE.Quaternion();
       ////newQuat.multiply(quaternion);
       //newQuat.premultiply(rotation);
       //newQuat.premultiply(targetQuat);
       //bone.quaternion.multiply(newQuat);
       //bone.quaternion.multiply(delta);
        //bone.prevWorldRotation = inverseWorld.clone();
    }

    // Reintializes whole body and ik joints when character was changed
    // Changing character height, head size will fire reinitialization
    reinitialize()
    {
        if(!this.isInitialized)
        {
            return;
        }
    
        let chainObjects = this.chainObjects;
        this.clonedObject.scale.copy(this.originalObject.scale);
        this.clonedObject.position.copy(this.originalObject.position);
        this.clonedObject.updateMatrixWorld(true);
        for(let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i].chain;
            let poleConstraints = this.poleConstraints[i];

            chain.joints[chain.joints.length - 1].bone.getWorldPosition(chainObjects[i].controlTarget.target.position);

            let targetPosition = new THREE.Vector3();
            chain.joints[chain.joints.length - 2].bone.getWorldPosition(targetPosition);
            let polePosition = poleConstraints.poleTarget.mesh.position;
            poleConstraints.poleTarget.mesh.position.set(targetPosition.x + polePosition.x, targetPosition.y + polePosition.y, targetPosition.z + polePosition.z);
            let poleTarget = poleConstraints.poleTarget;
            this.calculatePoleTargetOffset(poleTarget, chain);
            poleTarget.initialize(poleTarget.poleOffset);
            chain.reinitializeJoints();
        }
        this.hips.getWorldPosition(this.hipsControlTarget.target.position);
        this.calculteBackOffset();
        this.ikSwitcher.applyToIk();
        let hipsTarget = this.hipsControlTarget.target;
        this.objectTargetDiff = new THREE.Vector3().subVectors(hipsTarget.position, this.originalObject.position);
    }

    // Resets targets position
    // After ik has been turned off and on resets
    // pole position with consideration of offset
    resetTargets()
    {
        super.resetTargets();
        this.resetPoleTarget();
    }

    // Resets pole target position when object moved his hips position changed
    resetPoleTarget()
    {
        let chainObjects = this.chainObjects;
        let hipsTarget = this.hipsControlTarget.target;
        let {angle, axis} = this.hips.quaternion.toAngleAxis();
        for(let i = 0; i < chainObjects.length; i++)
        {
            let constraint = this.poleConstraints[i];
            let targetPosition = new THREE.Vector3();
            hipsTarget.getWorldPosition(targetPosition);
            let poleOffset = constraint.poleTarget.poleOffset;
            let mesh = constraint.poleTarget.mesh;
            mesh.position.set(targetPosition.x + poleOffset.x, targetPosition.y + poleOffset.y, targetPosition.z + poleOffset.z);
            mesh.rotateAroundPoint(targetPosition, axis, angle);
        }
    }

    // Removes object and all it's meshes from scene
    removeFromScene()
    {
        if(!this.isInitialized)
        {
            return;
        }
        let scene = this.scene;
        super.removeFromScene(scene);
        this.controlTargetSelection.dispose();
        this.poleConstraints.forEach((constraint)=>
        {
            scene.remove(constraint.poleTarget.mesh);
        });
    }

    // Selects/Deselects ragdoll and adds/removes it's elements to/from scene
    selectedSkeleton(selected)
    {
        if(!this.isInitialized)
        {
            return;
        }
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
        this.hipsControlTarget.disable = !visible;
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

    setUpControlTargetsInitialPosition()
    {
        //let cloneSkinnedMesh = this.clonedObject.children[1];
        this.controlTargets[0].isRotationLocked = true;
        for(let i = 0; i < this.chainObjects.length; i++)
        {
            let joints = this.ik.chains[i].joints;
            let bone = joints[joints.length-1].bone;
            this.controlTargets[i].target.quaternion.copy(bone.worldQuaternion());
            this.controlTargets[i].target.inverseInitialQuaternion = bone.worldQuaternion().inverse();
        }
        this.controlTargets[3].isRotationLocked = true;
        this.controlTargets[4].isRotationLocked = true;
        this.relativeFixedAngle();
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
            let inverseWorldQuaternion = this.originalData.inverseQuaternion ? this.originalData.inverseQuaternion : bone.worldQuaternion().inverse();
            let quaternion = this.originalData.quaternion ? this.originalData.quaternion : bone.quaternion;
            this.originalData.quaternion = quaternion.clone();
            this.originalData.inverseQuaternion = inverseWorldQuaternion.clone();

            let targetQuat = boneTarget.worldQuaternion();
            inverseWorldQuaternion.multiply(targetQuat);
            quaternion.multiply(inverseWorldQuaternion);

            let delta = new THREE.Quaternion();
            delta.multiply(quaternion.inverse());
            delta.multiply(targetQuat);

            this.relativeFixedAngleDelta[i] = delta;
        }

    }

    // Moves ragdoll hips when original object moved
    moveRagdoll()
    {
        this.clonedObject.position.copy(this.originalObject.position);
        this.clonedObject.updateMatrixWorld(true, true);
    }
}
module.exports =  Ragdoll;
