const IkObject = require( "./IkObject");
const THREE = require( "three");
const PoleConstraint = require( "../../constraints/PoleConstraint");
const PoleTarget = require( "../PoleTarget");
const CopyRotation = require( "../../constraints/CopyRotation");
const ControlTargetSelection = require( "../ControlTargetSelection");
require("../../utils/Object3dExtension");
const BoneRotationControl = require("../BoneRotationControl");
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
    }

    // Initializes ragdoll set up all neccessary information 
    initObject(scene, object, skinnedMesh, ...controlTarget )
    {
        super.initObject(scene, object, skinnedMesh, controlTarget );
        console.log(object);
        console.log();
        let cloneSkinnedMesh = this.clonedObject.children[1];
        this.controlTargets[0].isRotationLocked = true;
        this.controlTargets[0].target.rotation.copy(new THREE.Euler().setFromQuaternion(cloneSkinnedMesh.skeleton.bones[5].worldQuaternion()));
        this.controlTargets[1].target.rotation.copy(new THREE.Euler().setFromQuaternion(cloneSkinnedMesh.skeleton.bones[12].worldQuaternion()));
        this.controlTargets[2].target.rotation.copy(new THREE.Euler().setFromQuaternion(cloneSkinnedMesh.skeleton.bones[36].worldQuaternion()));
        this.controlTargets[3].target.rotation.copy(new THREE.Euler().setFromQuaternion(cloneSkinnedMesh.skeleton.bones[59].worldQuaternion()));
        this.controlTargets[4].target.rotation.copy(new THREE.Euler().setFromQuaternion(cloneSkinnedMesh.skeleton.bones[64].worldQuaternion()));
        this.controlTargets[3].isRotationLocked = true;
        this.controlTargets[4].isRotationLocked = true;

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
        hipsControl.addEventListener("change", (event) =>
        {
            if(this.hipsMouseDown)
            {
                this.resetPoleTarget();
                this.originalObject.position.copy(this.clonedObject.position);
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
            control.addEventListener("pointerdown", (event) =>
            {
                this.isEnabledIk = true;
            });

            control.addEventListener("pointerup", (event) =>
            {
                this.isEnabledIk = false;
            });
        }
    }
    updateCharacter(updateChar)
    {
        this.updateChar = updateChar;
    }
    // Runs cycle which is updating object
    update()
    {
        if(!this.isInitialized)
        {
            return;
        }
        super.update();
        if(!this.isEnabledIk)
        {
            this.resetTargets()
            this.ikSwitcher.applyToIk();
        }
        else
        {
            this.limbsFollowRotation();
            this.ikSwitcher.applyChangesToOriginal();
            let ikBones = [];
            for (let bone of this.originalObject.children[1].skeleton.bones)
            {
                if(!this.ikSwitcher.ikBonesName.some((boneName) => bone.name === boneName))
                {
                    continue;
                }
                ikBones.push(bone);
            }
            this.updateChar(ikBones);
        }
    }

    // Sets limbs rotation to control target rotation
    limbsFollowRotation()
    {
        for(let i = 0; i < this.chainObjects.length; i++)
        {
            let joints = this.ik.chains[i].joints;
            let bone = joints[joints.length -1].bone;

            let controlTarget = this.chainObjects[i].controlTarget;
            let boneTarget = controlTarget.target;
            // Checks if rotation locked and apply rotation 
            if(controlTarget.isRotationLocked)
            {
                this.rotateBoneQuaternion(bone, boneTarget.quaternion);
            }
            else
            {
                let localQuat = bone.parent.worldToLocalQuaternion(boneTarget.quaternion);
                bone.quaternion.copy(localQuat);
            }
            bone.updateMatrix();
            bone.updateMatrixWorld(true, true);
        }
    }

    // Runs after update to apply changes to object after ik solved
    lateUpdate()
    {
        super.lateUpdate();
    }

    // Sets and quaternion angle for bones
    // Give the result of bone always faces direction set by euler
    // Affected by hips rotation
    // Effect like flat foot to earth can be achieved
    rotateBoneQuaternion(bone, targetQuaternion)
    {
        let targetQuat = targetQuaternion.clone();
        let quaternion = new THREE.Quaternion();
        bone.getWorldQuaternion(quaternion);
        quaternion.inverse();
        let rotation = this.originalObject.children[0].worldQuaternion();
        //targetQuat.premultiply(this.originalObject.quaternion);
        targetQuat.premultiply(rotation);
        quaternion.multiply(targetQuat);
        bone.quaternion.multiply(quaternion);
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
            let chain = this.chainObjects[i].chain;
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

    // Moves ragdoll hips when original object moved
    moveRagdoll()
    {
        if(!this.isInitialized)
        {
            return;
        }
        this.clonedObject.position.copy(this.originalObject.position);
        this.clonedObject.updateMatrixWorld(false, true);
    }
}
module.exports =  Ragdoll;
