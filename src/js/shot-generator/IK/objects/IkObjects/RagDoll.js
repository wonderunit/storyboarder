const IkObject = require( "./IkObject");
const THREE = require( "three");
const PoleConstraint = require( "../../constraints/PoleConstraint");
const PoleTarget = require( "../PoleTarget");
const CopyRotation = require( "../../constraints/CopyRotation");
const setZForward = require( "../../utils/axisUtils");
const SkeletonUtils = require("../../utils/SkeletonUtils");

class RagDoll extends IkObject
{
    constructor()
    {
        super();
        this.poleConstraints = [];
        this.poleTargetOffsets = {};
        this.hipsMouseDown = false;
        this.isShotMode = false;

    }

    initObject(scene, object, skinnedMesh, ...controlTarget)
    {
        super.initObject(scene, object, skinnedMesh, controlTarget);

        // Adds events to Back control
        this.applyEventsToBackControl(this.controlTargets[0].control);


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


        this.addPoleConstraintToRootJoint(backChain, backPoleTarget);
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

        this.addHipsEvent();
        this.setUpControlEvents();
    }
    // Applies events to back control
    applyEventsToBackControl(backControl)
    {
        backControl.addEventListener("pointerdown", (event) =>
        {
            this.applyingOffset = true;
        });
        backControl.addEventListener("change", (event) =>
        {
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
        let position = new THREE.Vector3();
        chain.joints[chain.joints.length - 2].bone.getWorldPosition(position);
        let poleTarget = new PoleTarget(new THREE.Vector3(position.x + offset.x, position.y + offset.y, position.z + offset.z));
        poleTarget.poleOffset = offset;
        poleTarget.name = name;
        poleTarget.mesh.visible = false;
        return poleTarget;
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
        let hipsTarget = this.hipsControlTarget.target;

        let backConstraint = this.poleConstraints[0].poleTarget.mesh.position;
        let leftArmConstraint = this.poleConstraints[1].poleTarget.mesh.position;
        let rightArmConstraint = this.poleConstraints[2].poleTarget.mesh.position;
        let leftLegConstraint = this.poleConstraints[3].poleTarget.mesh.position;
        let rightLegConstraint = this.poleConstraints[4].poleTarget.mesh.position;

        hipsControl.addEventListener("pointerdown", (event) =>
        {
            this.hipsMouseDown = true;

            this.poleTargetOffsets.back = backConstraint.clone().sub(hipsTarget.position);
            this.poleTargetOffsets.leftArm = leftArmConstraint.clone().sub(hipsTarget.position);
            this.poleTargetOffsets.rightArm = rightArmConstraint.clone().sub(hipsTarget.position);
            this.poleTargetOffsets.leftLeg = leftLegConstraint.clone().sub(hipsTarget.position);
            this.poleTargetOffsets.rightLeg = rightLegConstraint.clone().sub(hipsTarget.position);

        });
        hipsControl.addEventListener("change", (event) =>
        {
            if(this.hipsMouseDown)
            {
                let hipsPosition = hipsTarget.position.clone();
                hipsPosition.add(this.poleTargetOffsets.back);
                backConstraint.copy(hipsPosition);

                hipsPosition = hipsTarget.position.clone();
                hipsPosition.add(this.poleTargetOffsets.leftArm);
                leftArmConstraint.copy(hipsPosition);

                hipsPosition = hipsTarget.position.clone();
                hipsPosition.add(this.poleTargetOffsets.rightArm);
                rightArmConstraint.copy(hipsPosition);

                hipsPosition = hipsTarget.position.clone();
                hipsPosition.add(this.poleTargetOffsets.leftLeg);
                leftLegConstraint.copy(hipsPosition);

                hipsPosition = hipsTarget.position.clone();
                hipsPosition.add(this.poleTargetOffsets.rightLeg);
                rightLegConstraint.copy(hipsPosition);
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
                console.log("Ik enabled");
                this.isEnabledIk = true;
            });

            control.addEventListener("pointerup", (event) =>
            {
                console.log("Ik disabled");
                this.isEnabledIk = false;
            });
        }
    }

    update()
    {
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
        //let rightFootBone = this.ik.chains[4].joints[2].bone;
        //let rightLegChainTarget = this.chainObjects[4].controlTarget.target;
        //rightFootBone.rotation.copy(rightLegChainTarget.rotation);
        //this.rotateBoneQuaternion(rightFootBone, new THREE.Euler(0.5, 0, 0));
        //// Makes left foot follow the rotation of target
        //let leftFootBone = this.ik.chains[3].joints[2].bone;
        //let leftLegChainTarget = this.chainObjects[3].controlTarget.target;
        //leftFootBone.rotation.copy(leftLegChainTarget.rotation);
        //this.rotateBoneQuaternion(leftFootBone, new THREE.Euler(0.5, 0, 0));
    }

    // Sets and quaternion angle for bones
    // Give the result of bone always faces direction set by euler
    // Effect like flat foot to earth can be achieved
    rotateBoneQuaternion(bone, euler)
    {
        //let quaternion = new THREE.Quaternion();
        //bone.getWorldQuaternion(quaternion);
        //quaternion.inverse();
        //let angle = new THREE.Quaternion().setFromEuler(euler);
        //quaternion.multiply(angle);
        //bone.quaternion.copy(quaternion);
    }

    reinitialize()
    {
        let chainObjects = this.chainObjects;
        console.log(this.originalObject);
        console.log(this.clonedObject);
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
            chain.reinitializeJoints();
            if(chain.joints[0].bone.name === "LeftArm")
            {
                console.log(chain.joints[0].bone.quaternion.clone());
                let firstBoneWorld = new THREE.Vector3();
                let secondBoneWorld = new THREE.Vector3();
                chain.joints[0].bone.getWorldPosition(firstBoneWorld);

                chain.joints[1].bone.getWorldPosition(secondBoneWorld);

                console.log(firstBoneWorld)
                console.log(secondBoneWorld)
                let direction = new THREE.Vector3().subVectors(secondBoneWorld, firstBoneWorld).normalize();
                console.log(direction);
            }
        }

        this.hips.getWorldPosition(this.hipsControlTarget.target.position);
        this.calculteBackOffset();
    }

    // Resets targets position
    // After ik has been turned off and on resets
    // pole position with consideration of offset
    resetTargets()
    {
        super.resetTargets();
        let chainObjects = this.chainObjects;
        for(let i = 0; i < chainObjects.length; i++)
        {
            let constraint = this.poleConstraints[i];
            let chain = this.chainObjects[i].chain;
            let targetPosition = new THREE.Vector3();
            chain.joints[chain.joints.length - 2].bone.getWorldPosition(targetPosition);
            let poleOffset = constraint.poleTarget.poleOffset;
            constraint.poleTarget.mesh.position.set(targetPosition.x + poleOffset.x, targetPosition.y + poleOffset.y, targetPosition.z + poleOffset.z);

        }
    }

    // Applies neck rotation and applies head rotation that head stay upward
    applyHeadRotation()
    {
        let head = this.chainObjects[0].chain.joints[4].bone;
        this.rotateBoneQuaternion(head, new THREE.Euler(-1, 0, 0));
    }

    removeFromScene(scene)
    {
        super.removeFromScene(scene);
        this.poleConstraints.forEach((constraint)=>
        {
            scene.remove(constraint.poleTarget.mesh);
        });
    }

    selectedSkeleton(selected)
    {
        let visible = selected;
        let chainObjects = this.chainObjects;
        for (let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i];
            chain.controlTarget.disable(!visible);
        }
        this.hipsControlTarget.disable(!visible);
        this.skeletonHelper.visible = visible;
    }

    changeZToPositive()
    {
        setZForward(this.hips, new THREE.Vector3(0, 0, 1));
        this.hips.updateWorldMatrix(true, true);
        this.rigMesh.bind(this.rigMesh.skeleton);
    }

    applyChangesToOriginal()
    {
        let clonedSkin = this.clonedObject.children[1];
        let originalSkin = this.originalObject.children[1];
        let clonedBones = clonedSkin.skeleton.bones;
        let originalBones = originalSkin.skeleton.bones;

        let cloneHips = this.clonedObject.children[0];
        let originalHips = this.originalObject.children[0];
        let cloneBoneMatrix = cloneHips.matrix;
        let inverseCloneBoneMatrix = new THREE.Matrix4().getInverse(cloneBoneMatrix);
       // originalHips.rotateX(-Math.PI/2);
        let originalHipsQuaternion = originalHips.quaternion;
        originalHips.applyMatrix(inverseCloneBoneMatrix);
        // originalHips.rotation.x = Math.PI/2;
        originalHips.updateMatrixWorld(true, true);
        for (let i = 0; i < clonedBones.length; i++)
        {

            let cloneBone = clonedBones[i];
            let originalBone = originalBones[i];

            if(!this.ikBonesName.some((boneName) => originalBone.name === boneName))
            {
                continue;
            }
            if(originalBone.name === "LeftArm")
            {

            }
            //originalBone.position.set(cloneBone.position.x, cloneBone.position.z, cloneBone.position.y);
            originalBone.quaternion.copy(cloneBone.quaternion);
            //console.log(this.chainObjects);
            originalBone.rotation.set(originalBone.rotation.x, originalBone.rotation.z, -originalBone.rotation.y);
            if(this.chainObjects.some((chainObject) => chainObject.baseObjectName === originalBone.name))
            {
                //originalBone.rotateX(Math.PI);
                console.log("Rotated");
            }

            //originalBone.rotation.z = 0;
            //originalBone.rotateX(Math.PI/2);


            //originalBone.updateMatrixWorld(true);
        }

        originalHips.applyMatrix(cloneBoneMatrix);
        originalHips.quaternion.copy(originalHipsQuaternion);
        //originalHips.rotation.x = -originalHips.rotation.x;
        //originalHips.rotation.y = -originalHips.rotation.y;
        //originalHips.rotation.z = -originalHips.rotation.z;
       // originalHips.children[0].rotateX(-Math.PI/2);
        //originalHips.children[0].rotateX(-Math.PI/2);
        originalHips.updateMatrixWorld(true, true);
        //this.originalObject.rotation.set(-Math.PI/2, this.originalObject.rotation.y, this.originalObject.rotation.z);
        //this.originalObject.updateMatrixWorld(true, true);
        console.log(this.clonedObject);
        console.log(this.originalObject);
    }

}
module.exports =  RagDoll;
