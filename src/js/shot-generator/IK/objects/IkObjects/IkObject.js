const {IK, IKJoint}  = require("../../core/three-ik");
const THREE = require( "three");
const {setZDirecion, setReverseZ} = require( "../../utils/axisUtils");
const ChainObject = require( "./ChainObject");
const SkeletonUtils = require("../../utils/SkeletonUtils");

// IKObject is class which applies ik onto skeleton
class IkObject
{
    constructor()
    {
        if(new.target === IkObject)
        {
            throw new TypeError("Cannot construct abstract IkObject directly");
        }
        this.applyingOffset = false;
        this.isEnabledIk = false;
        this.controlTargets = [];
        this.originalObject = null;
        this.clonedObject = null;
        this.ikBonesName = [];

        this.originalObjectMatrix = {};
        this.cloneObjectMatrix = {};
    }

    // Takes skeleton and target for it's limbs
    initObject(scene, objectSkeleton, skinnedMesh, ...controlTarget)
    {
        this.ik = new IK();
        let chains = [];

        let clonedSkeleton = SkeletonUtils.clone(objectSkeleton);

        this.originalObject = objectSkeleton;
        this.clonedObject = clonedSkeleton;

        this.rigMesh = clonedSkeleton.children[1];
        let rigMesh = this.rigMesh;

        let skeleton = null;
        this.controlTargets = controlTarget[0];
        this.addParentToControl(objectSkeleton.uuid);
        let chainObjects = [];
        this.chainObjects = chainObjects;
        this.hipsControlTarget = this.controlTargets[5];
        this.hipsControlTarget.disable = true;
        chainObjects.push(new ChainObject("Spine", "Head", this.controlTargets[0]));
        chainObjects.push(new ChainObject("LeftArm", "LeftHand", this.controlTargets[1]));
        chainObjects.push(new ChainObject("RightArm", "RightHand", this.controlTargets[2]));
        chainObjects.push(new ChainObject("LeftUpLeg", "LeftFoot", this.controlTargets[3]));
        chainObjects.push(new ChainObject("RightUpLeg", "RightFoot", this.controlTargets[4]));
        scene.add(clonedSkeleton);
        // Goes through all scene objects
        clonedSkeleton.traverse((object) =>
        {
            // Searches only bones object
            if(object instanceof THREE.Bone)
            {

                // Finds skeleton for skeletonHelper
                if(skeleton === null)
                {
                    let parent = object.parent;
                    // Goes up the parent list to find out not a bone
                    // If parent of Bone not a Bone than it's skeleton
                    while (parent instanceof THREE.Bone)
                    {
                        parent = parent.parent;
                    }
                    skeleton = parent;
                }
                // Flips a model's forward from -Z to +Z
                // By default Models axis is -Z while Three ik works with +Z
                if(object.name === "Hips")
                {
                    this.hips = object;
                    setZDirecion(object, new THREE.Vector3(0, 0, 1));
                    rigMesh.bind(rigMesh.skeleton);

                    let objectWorld = new THREE.Vector3();
                    object.getWorldPosition(objectWorld);
                    this.hipsControlTarget.target.position.copy(objectWorld);
                }
                // Goes through all chain objects to find with which we are working
                chainObjects.forEach((chainObject) =>
                {
                    // Finds base Object Name or an object from which chain starting
                    // Also checks if chain is started
                    if(object.name == chainObject.baseObjectName || chainObject.isChainObjectStarted)
                    {
                        let chain = chainObject.chain;

                        // Checks if root object
                        if(object.name === chainObject.baseObjectName)
                        {
                            chainObject.isChainObjectStarted = true;
                            chains.push(chain);
                        }
                        // Declares target
                        // Target(Effector) is object to which chain is trying to get
                        let target =  null;
                        // Checks if object is last
                        if(object.name === chainObject.lastObjectName)
                        {
                            target = chainObject.controlTarget.target;
                            let objectWorld = new THREE.Vector3();
                            object.getWorldPosition(objectWorld);
                            target.position.copy(objectWorld);

                            chainObject.isChainObjectStarted = false;
                        }
                        this.ikBonesName.push(object.name);
                        // Creates joint by passing current bone and its constraint
                        let joint = new IKJoint(object, {});
                        let globaPose = new THREE.Vector3();
                        // Adds joint to chain and sets target
                        chain.add(joint, {target});
                    }
                });


            }
        });
        scene.remove(clonedSkeleton);
        // Goes through list of constraints and adds it to IK
        chains.forEach((chain) =>
        {
            this.ik.add(chain);
        });
        // Sets skeleton helper for showing bones
        this.skeletonHelper = new THREE.SkeletonHelper( skeleton );
        // Sets line width of skeleton helper
        this.skeletonHelper.material.linewidth = 7;

        // Adds skeleton helper to scene
        scene.add( this.skeletonHelper );
    }

    // Calculates back's offset in order to move with hips
    calculteBackOffset()
    {
        let backPosition = this.chainObjects[0].controlTarget.target.position.clone();
        let hipsPosition = this.hipsControlTarget.target.position.clone();
        this.backOffset = backPosition.sub(hipsPosition);
    }

    // Updates chains
    // Only done this left limbs in order to see difference
    update()
    {
        if(this.isEnabledIk)
        {
            // Solves the inverse kinematic of object
            this.ik.solve();

            if(IK.firstRun)
            {
                this.recalculateDifference();
            }
            this.lateUpdate();
        }
    }

    // Updates which is called last after all stuff in loop has been done
    // Fires after ik solver in order to apply custom changes to models
    // Ik solver overrides all changes if applied before it's fired
    lateUpdate()
    {
        let hipsTarget = this.hipsControlTarget.target;
        // Sets back position when offset is not changing
        // When we are changing back position offset between hips and back shouldn't be applied
        if(!this.applyingOffset)
        {
            let backTarget = this.chainObjects[0].controlTarget.target;
            let hipsPosition = hipsTarget.position.clone();
            let result = hipsPosition.add(this.backOffset);
            backTarget.position.copy(result);
        }

    }

    // Removes ikObject's all elements from scene
    // Control target consists of two things: mesh and control
    // before removed mesh should be detached from control
    removeFromScene(scene)
    {
        this.chainObjects.forEach((chainObject) =>
        {
            let control = chainObject.controlTarget.control;
            let target = chainObject.controlTarget.target;
            control.detach(target);
            scene.remove(target);
            scene.remove(control);
        });
        this.hipsControlTarget.control.detach(this.hipsControlTarget.target);
        scene.remove(this.hipsControlTarget.target);
        scene.remove(this.hipsControlTarget.control);
        scene.remove(this.skeletonHelper);
    }

    // Resets targets position
    // After IK has been turned off and on
    resetTargets()
    {
        let chainObjects = this.chainObjects;
        this.hips.getWorldPosition(this.hipsControlTarget.target.position);
        for(let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i].chain;
            let jointBone = chain.joints[chain.joints.length - 1].bone;
            if(jointBone.name === "LeftFoot" || jointBone.name === "RightFoot" ||
                jointBone.name === "LeftHand" || jointBone.name === "RightHand" ||
                jointBone.name === "Head" || jointBone.name === "Hips")
            {
                let targetPosition = chainObjects[i].controlTarget.target.position;
                jointBone.getWorldPosition(targetPosition);
            }
            else
            {
                let bone =  this.originalObject.getObjectByName(jointBone.name);
                let targetPosition = chainObjects[i].controlTarget.target.position;
                bone.getWorldPosition(targetPosition);
            }

        }
        this.calculteBackOffset();
    }

    // Recalculates positions of transform controls
    // It works when ik is disable and when enabled in order to recalculate all position
    // Which have been changed while ik was turned off
    recalculate()
    {
        let back = this.chainObjects[0].chain.joints[4].bone;
        let backTarget = this.chainObjects[0].controlTarget.target;

        let leftHand = this.chainObjects[1].chain.joints[2].bone;
        let leftHandTarget = this.chainObjects[1].controlTarget.target;

        let rightHand = this.chainObjects[2].chain.joints[2].bone;
        let rightHandTarget = this.chainObjects[2].controlTarget.target;

        let leftLeg = this.chainObjects[3].chain.joints[2].bone;
        let leftLegTarget = this.chainObjects[3].controlTarget.target;

        let rightLeg = this.chainObjects[4].chain.joints[2].bone;
        let rightLegTarget = this.chainObjects[4].controlTarget.target;

        back.getWorldPosition(backTarget.position);
        leftHand.getWorldPosition(leftHandTarget.position);
        rightHand.getWorldPosition(rightHandTarget.position);
        leftLeg.getWorldPosition(leftLegTarget.position);
        rightLeg.getWorldPosition(rightLegTarget.position);
        this.calculteBackOffset();
    }

    addParentToControl(parentId)
    {
        let controlTarget = this.controlTargets;
        for (let i = 0; i < controlTarget.length; i++)
        {
            let control = controlTarget[i].control;
            control.characterId = parentId;
        }
    }

    recalculateDifference()
    {
        let clonedSkin = this.clonedObject.children[1];
        let originalSkin = this.originalObject.children[1];
        let clonedBones = clonedSkin.skeleton.bones;
        let originalBones = originalSkin.skeleton.bones;
        for (let i = 0; i < clonedBones.length; i++)
        {
            let originalBone = originalBones[i];
            let cloneBone = clonedBones[i];

            if(!this.ikBonesName.some((boneName) => originalBone.name === boneName || boneName === "Hips"))
            {
                continue;
            }
            this.originalObjectMatrix[originalBone.name] = originalBone.matrix.clone();
            this.cloneObjectMatrix[cloneBone.name] = cloneBone.matrix.clone();
        }
    }
}

module.exports =  IkObject;
