const IkObject = require( "./IkObject");
const THREE = require( "three");
const PoleConstraint = require( "../../constraints/PoleConstraint");
const PoleTarget = require( "../PoleTarget");
const CopyRotation = require( "../../constraints/CopyRotation");
const {setZForward, setReverseZ} = require( "../../utils/axisUtils");
require("../../utils/Object3dExtension");

class Ragdoll extends IkObject
{
    constructor()
    {
        super();
        this.poleConstraints = [];
        this.hipsMouseDown = false;
        this.isInitialized = false;
        this.scene = null;
    }

    initObject(scene, object, skinnedMesh, ...controlTarget )
    {
        super.initObject(scene, object, skinnedMesh, controlTarget );

        // Adds events to Back control
        this.applyEventsToBackControl(this.controlTargets[0].control);
        this.scene = scene;
        let backChain = this.ik.chains[0];
        let leftArmChain = this.ik.chains[1];
        let rightArmChain = this.ik.chains[2];
        let leftLegChain = this.ik.chains[3];
        let rightLegChain = this.ik.chains[4];

        let leftArmPoleTarget = this.initPoleTargets(leftArmChain, new THREE.Vector3(0, 0, -0.5), "leftArmPole");
        let leftLegPoleTarget = this.initPoleTargets(leftLegChain, new THREE.Vector3(0, 0.3, 0.8), "leftLegPole");

        let rightArmPoleTarget = this.initPoleTargets(rightArmChain, new THREE.Vector3(0, 0, -0.5), "rightArmPole");
        let rightLegPoleTarget = this.initPoleTargets(rightLegChain, new THREE.Vector3(0, 0.3, 0.8), "rightLegPole");

        let backPoleTarget =  this.initPoleTargets(backChain, new THREE.Vector3(0, 0, 0), "backPole");

        scene.add(leftArmPoleTarget.mesh);
        scene.add(leftLegPoleTarget.mesh);
        scene.add(rightArmPoleTarget.mesh);
        scene.add(rightLegPoleTarget.mesh);
        scene.add(backPoleTarget.mesh);

        //this.addPoleConstraintToRootJoint(backChain, backPoleTarget);
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
        this.poleConstraints[1].testing = true;
        this.resetTargets();
        this.addHipsEvent();
        this.setUpControlEvents();
        this.initializeAxisAngle();
        this.isInitialized = true; 

        scene.remove(leftArmPoleTarget.mesh);
        scene.remove(leftLegPoleTarget.mesh);
        scene.remove(rightArmPoleTarget.mesh);
        scene.remove(rightLegPoleTarget.mesh);
        scene.remove(backPoleTarget.mesh);

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

    calculatePoleTargetOffset(poleTarget, chain)
    {
        let offset = poleTarget.initialOffset;
        let position = chain.joints[chain.joints.length - 2].bone.worldPosition();
        let hipsOffset = position.clone().sub(this.hips.worldPosition());
        hipsOffset.add(this.hips.position);
        hipsOffset.add(offset);
        poleTarget.poleOffset = hipsOffset;
    }

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

    update()
    {
        if(!this.isInitialized)
        {
            return;
        }
        super.update();
        if(!this.isEnabledIk)
        {
            this.resetTargets();
        }
        else
        {
            this.applyChangesToOriginal();
        }
    }

    lateUpdate()
    {
        this.legsFollowTargetRotation();
        super.lateUpdate();
        this.applyHeadRotation();
    }

    // Follows moving target rotation which applied to feet
    // Default position is facing flat to Earth
    legsFollowTargetRotation()
    {
        // Makes right foot follow the rotation of target
        let rightFootBone = this.ik.chains[4].joints[2].bone;
        let rightLegChainTarget = this.chainObjects[4].controlTarget.target;
        rightFootBone.rotation.copy(rightLegChainTarget.rotation);
        this.rotateBoneQuaternion(rightFootBone, new THREE.Euler(0.5, 0, 0));
        rightFootBone.updateMatrix();
        rightFootBone.updateMatrixWorld(true);
        // Makes left foot follow the rotation of target
        let leftFootBone = this.ik.chains[3].joints[2].bone;
        let leftLegChainTarget = this.chainObjects[3].controlTarget.target;
        leftFootBone.rotation.copy(leftLegChainTarget.rotation);
        this.rotateBoneQuaternion(leftFootBone, new THREE.Euler(0.5, 0, 0));
        leftFootBone.updateMatrix();
        leftFootBone.updateMatrixWorld(true);
    }

    // Sets and quaternion angle for bones
    // Give the result of bone always faces direction set by euler
    // Effect like flat foot to earth can be achieved
    rotateBoneQuaternion(bone, euler)
    {
        let quaternion = new THREE.Quaternion();
        bone.getWorldQuaternion(quaternion);
        quaternion.inverse();
        let angle = new THREE.Quaternion().setFromEuler(euler);
        quaternion.multiply(angle);
        bone.quaternion.copy(quaternion);
    }

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
        this.applyToIk();
    }

    // Resets targets position
    // After ik has been turned off and on resets
    // pole position with consideration of offset
    resetTargets()
    {
        super.resetTargets();
        this.resetPoleTarget();
    }

    resetPoleTarget()
    {
        let chainObjects = this.chainObjects;
        let hipsTarget = this.hipsControlTarget.target;
        for(let i = 0; i < chainObjects.length; i++)
        {
            let constraint = this.poleConstraints[i];
            let chain = this.chainObjects[i].chain;
            let targetPosition = new THREE.Vector3();
            hipsTarget.getWorldPosition(targetPosition);
            let poleOffset = constraint.poleTarget.poleOffset;
            constraint.poleTarget.mesh.position.set(targetPosition.x + poleOffset.x, targetPosition.y + poleOffset.y, targetPosition.z + poleOffset.z);
        }
    }

    // Applies neck rotation and applies head rotation that head stay upward
    applyHeadRotation()
    {
        let head = this.chainObjects[0].chain.joints[4].bone;
        this.rotateBoneQuaternion(head, new THREE.Euler(-1.0, 0, 0));
        head.updateMatrix();
    }

    removeFromScene(scene)
    {
        if(!this.isInitialized)
        {
            return;
        }
        super.removeFromScene(scene);
        this.poleConstraints.forEach((constraint)=>
        {
            scene.remove(constraint.poleTarget.mesh);
        });
    }

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
                chain.controlTarget.addToScene(this.scene);
            }
            else
            {
                chain.controlTarget.removeFromScene(this.scene);
            }
        }
        this.hipsControlTarget.disable = !visible;
        if(visible)
        {
            this.hipsControlTarget.addToScene(this.scene);
        }
        else
        {
            this.hipsControlTarget.removeFromScene(this.scene);
        }
      
    }

    moveRagdoll()
    {
        if(!this.isInitialized)
        {
            return;
        }
        this.clonedObject.position.copy(this.originalObject.position);
        this.clonedObject.updateMatrixWorld(false, true);
    }

    applyChangesToOriginal()
    {
        if(!this.isInitialized)
        {
            return;
        }
        let clonedSkin = this.clonedObject.children[1];
        let originalSkin = this.originalObject.children[1];
        let clonedBones = clonedSkin.skeleton.bones;
        let originalBones = originalSkin.skeleton.bones;

        for (let i = 0; i < clonedBones.length; i++)
        {
            let cloneBone = clonedBones[i];
            let originalBone = originalBones[i];
            if(!this.ikBonesName.some((boneName) => originalBone.name === boneName))
            {
                continue;
            }
            this.cloneToOriginRotation(cloneBone, originalBone);
            if(cloneBone.name === "Hips")
            {
                this.basisSwitchinBack(cloneBone, originalBone);
            }
        }
        this.recalculateDifference();
    }

    applyToIk()
    {
        if(!this.isInitialized)
        {
            return;
        }
        let clonedSkin = this.clonedObject.children[1];
        let originalSkin = this.originalObject.children[1];
        let clonedBones = clonedSkin.skeleton.bones;
        let originalBones = originalSkin.skeleton.bones;
        for (let i = 0; i < clonedBones.length; i++)
        {
            let cloneBone = clonedBones[i];
            let originalBone = originalBones[i];
            if(!this.ikBonesName.some((boneName) => originalBone.name === boneName))
            {
                continue;
            }
            this.originToCloneRotation(cloneBone, originalBone);
        }
        //this.initializeAxisAngle();
    }

    basisSwitchinBack(cloneBone, originalBone)
    {
        cloneBone.updateMatrix();
        originalBone.updateMatrix();
        cloneBone.updateMatrixWorld(true);
        originalBone.updateMatrixWorld(true);

        let originalPrevMatrix = this.originalObjectMatrix[originalBone.name].clone();
        let originalCurrentMatrix = originalBone.matrix.clone();
        let clonePrevMatrix = this.cloneObjectMatrix[cloneBone.name].clone();
        let cloneCurrentMatrix = cloneBone.matrix.clone();
        let cloneInversePrevMatrix = new THREE.Matrix4().getInverse(clonePrevMatrix);
        let tMatrixPrevClone = new THREE.Matrix4();

        tMatrixPrevClone.multiply(originalCurrentMatrix);
        tMatrixPrevClone.multiply(cloneInversePrevMatrix);

        clonePrevMatrix.premultiply(tMatrixPrevClone);
        cloneCurrentMatrix.premultiply(tMatrixPrevClone);

        this.setObjectFromMatrixElements(cloneCurrentMatrix, originalBone);

    }

    setObjectFromMatrixElements(matrix, object)
    {
        let position = new THREE.Vector3();
        let rotation = new THREE.Quaternion();
        let scale = new THREE.Vector3();
        matrix.decompose(position, rotation, scale);
        let euler = new THREE.Euler().setFromQuaternion(rotation);
        //object.rotation.set(euler.x, euler.y, euler.z);
        object.position.copy(position);
        //object.quaternion.copy(rotation);
        object.updateMatrix();
    }

    cloneToOriginRotation(cloneBone, originBone)
    {
        cloneBone.updateMatrixWorld(true);
        let cloneGlobalQuat = cloneBone.worldQuaternion();
        cloneGlobalQuat.multiply(this.bonesDelta[cloneBone.name].cloneToOriginDelta);
        let transformMatrix = new THREE.Matrix4();
        transformMatrix.multiply(originBone.matrix);
        transformMatrix.multiply(originBone.matrixWorld.inverse());
        cloneGlobalQuat.applyMatrix(transformMatrix);
        originBone.quaternion.copy(cloneGlobalQuat);
        originBone.updateMatrix();
        originBone.updateWorldMatrix(false, true);
    }

    originToCloneRotation(cloneBone, originBone)
    {
        let originalGlobalQuat = originBone.worldQuaternion();
        originalGlobalQuat.multiply(this.bonesDelta[originBone.name].originToCloneDelta);
        let transformMatrix = new THREE.Matrix4();
        transformMatrix.multiply(cloneBone.matrix);
        transformMatrix.multiply(cloneBone.matrixWorld.inverse());
        originalGlobalQuat.applyMatrix(transformMatrix);
        cloneBone.quaternion.copy(originalGlobalQuat);
        cloneBone.updateMatrix();
        cloneBone.updateMatrixWorld(true);
        originBone.updateWorldMatrix(false, true);
    }
}
module.exports =  Ragdoll;
