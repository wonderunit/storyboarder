const {IK, IKJoint, IKHelper}  = require("../../core/three-ik");
const THREE = require( "three");
const {setZDirecion, setReverseZ} = require( "../../utils/axisUtils");
const ChainObject = require( "./ChainObject");
const SkeletonUtils = require("../../utils/SkeletonUtils");
const IKSwitcher = require("./IkSwitcher");
require("../../utils/Object3dExtension");

class IkObject
{
    constructor()
    {
        if(new.target === IkObject)
        {
            throw new TypeError("Cannot construct abstract IkObject directly");
        }
        this.bonesDelta = {};
        this.ikSwitcher = null;
        this.isEnabledIk = false;
        this.clonedObject = null;
        this.controlTargets = [];
        this.originalObject = null;
        this.applyingOffset = false;
        this.isRotation = false;
        this.scene = null;  
    }

    //#region External Methods
    // Takes skeleton and target for it's limbs
    initObject(scene, objectSkeleton, controlTargets)
    {
        this.ik = new IK();
        this.scene = scene;
        let chains = [];
        let clonedSkeleton = SkeletonUtils.clone(objectSkeleton);
        this.clonedObject = clonedSkeleton;
        this.originalObject = objectSkeleton;
        this.ikSwitcher = new IKSwitcher(objectSkeleton, clonedSkeleton);

        this.rigMesh = clonedSkeleton.children[1];
        let rigMesh = this.rigMesh;
        this.controlTargets = controlTargets;
        this.addParentToControl(objectSkeleton.uuid);
        let chainObjects = [];
        this.chainObjects = chainObjects;
        this.hipsControlTarget = this.controlTargets[5];

        chainObjects.push(new ChainObject("Spine", "Head", this.controlTargets[0]));
        chainObjects.push(new ChainObject("LeftArm", "LeftHand", this.controlTargets[1]));
        chainObjects.push(new ChainObject("RightArm", "RightHand", this.controlTargets[2]));
        chainObjects.push(new ChainObject("LeftUpLeg", "LeftFoot", this.controlTargets[3]));
        chainObjects.push(new ChainObject("RightUpLeg", "RightFoot", this.controlTargets[4]));

        //Fixing female-adult spine deformation
        if(rigMesh.name === "female-adult-meso")
        {
            rigMesh.skeleton.bones[2].rotation.set(0, 0, 0);
            rigMesh.skeleton.bones[2].updateMatrix();
            rigMesh.skeleton.bones[2].updateMatrixWorld(true, true);
        }
       
        let skeleton = null;
        // Goes through all scene objects
        clonedSkeleton.traverse((object) =>
        {
            // Searches only bones object
            if(object instanceof THREE.Bone)
            {
                object.matrixAutoUpdate = false;
                object.matrixWorldNeedsUpdate = false;
                // Flips a model's forward from -Z to +Z
                // By default Models axis is -Z while Three ik works with +Z
                if(object.name === "Hips")
                {
                    this.hips = object;
                    this.hipsControlTarget.setBone(object);
                    setZDirecion(object, new THREE.Vector3(0, 0, 1));
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
                            chainObject.isChainObjectStarted = false;
                            chainObject.controlTarget.setBone(object);
                        }
                        this.ikSwitcher.ikBonesName.push(object.name);
                        // Creates joint by passing current bone and its constraint
                        let joint = new IKJoint(object, {});
                        // Adds joint to chain and sets target
                        chain.add(joint, {target});
                    }
                });
            }
        });
        this.ikSwitcher.ikBonesName.push("Hips");
        // Goes through list of constraints and adds it to IK
        chains.forEach((chain) =>
        {
            this.ik.add(chain);
        });
        // Adds skeleton helper to scene
        this.ikSwitcher.recalculateDifference();
        this.ikSwitcher.calculateRelativeAngle();
    }

    // Updates chains
    // Only done this left limbs in order to see difference
    update()
    {
        if(this.isEnabledIk)
        {
            if(!this.isRotation)
            {
                let target = this.getTargetForSolve();
                // Solves the inverse kinematic of object
                this.ik.solve(target);
            }
            this.lateUpdate();
            if(IK.firstRun)
            {
                this.ikSwitcher.recalculateDifference();
            }
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
    removeFromScene()
    {
        let scene = this.scene;
        this.chainObjects.forEach((chainObject) =>
        {
            let control = chainObject.controlTarget.control;
            control.detach();
            scene.remove(control);
        });
        this.hipsControlTarget.control.detach(this.hipsControlTarget.target);
        scene.remove(this.hipsControlTarget.control);
    }
    //#endregion

    //#region Internal methods
    // Sets character id to controls and points to identify them in SelectionManager
    addParentToControl(parentId)
    {
        let controlTarget = this.controlTargets;
        for (let i = 0; i < controlTarget.length; i++)
        {
            let control = controlTarget[i].control;
            let target = controlTarget[i].target;
            control.characterId = parentId;
            target.characterId = parentId;
        }
    }

    getTargetForSolve()
    {
        let controlTargets = this.controlTargets;
        for(let i = 1; i < controlTargets.length; i++)
        {
            let target = controlTargets[i].target;
            if(target.isActivated === true)
            {
                return target;
            }
        }
        return null;
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
            // Sets target position to ik last joints in each chain 
            if(jointBone.name === "LeftFoot" || jointBone.name === "RightFoot" ||
            jointBone.name === "LeftHand" || jointBone.name === "RightHand" ||
            jointBone.name === "Head" || jointBone.name === "Hips")
            {
                let targetPosition = chainObjects[i].controlTarget.target.position;
                jointBone.getWorldPosition(targetPosition);
            }
        }
        this.calculteBackOffset();
    }

    // Calculates back's offset in order to move with hips
    calculteBackOffset()
    {
        let backPosition = this.chainObjects[0].controlTarget.target.position.clone();
        let hipsPosition = this.hipsControlTarget.target.position.clone();
        this.backOffset = backPosition.sub(hipsPosition);
    }
    //#endregion
}

module.exports =  IkObject;
