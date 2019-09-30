const {IK, IKJoint}  = require("../../../../shot-generator/IK/core/three-ik");
const THREE = require( "three");
const {setZDirecion, setReverseZ} = require( "../../../../shot-generator/IK/utils/axisUtils");
const ChainObject = require( "../../../../shot-generator/IK/objects/IkObjects/ChainObject");
const SkeletonUtils = require("../../../../shot-generator/IK/utils/SkeletonUtils");
const XRIKSwitcher = require("./XrIKSwitcher");
require("../../../../shot-generator/IK/utils/Object3dExtension");

class XrIkObject
{
    constructor()
    {
        if(new.target === XrIkObject)
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
        this.hipsMouseDown = false;
    }

    //#region External Methods
    // Take ns skeleton and target for it's limbs
    initObject(scene, objectSkeleton, controlTargets)
    {
        this.ik = new IK();
        this.scene = scene;
        let chains = [];
        let clonedSkeleton = SkeletonUtils.clone(objectSkeleton);
        this.clonedObject = clonedSkeleton;
        this.originalObject = objectSkeleton;
        this.ikSwitcher = new XRIKSwitcher(objectSkeleton, clonedSkeleton);
        this.rigMesh = clonedSkeleton.getObjectByProperty("type", "SkinnedMesh");
        this.originalMesh = objectSkeleton.getObjectByProperty("type", "SkinnedMesh");
        let rigMesh = this.rigMesh;
        let chainObjects = [];
        this.chainObjects = chainObjects;
        this.controlTargets = [];
        
        //TODO(): Currently this logic of identifying the control point is just hoping 
        // that passed controlTarget is belong to current "limb"
        // Just pass empty controlPoints and initialize them here
        // So to remove this "strongly typed logic" where we depend on some names
        
        let headControl = controlTargets.find(point => point.name === "Head");
        let leftArmControl = controlTargets.find(point => point.name === "LeftHand");
        let rightArmControl = controlTargets.find(point => point.name === "RightHand");
        let leftLegControl = controlTargets.find(point => point.name === "LeftFoot");
        let rightLegControl = controlTargets.find(point => point.name === "RightFoot");
        let hipsControl = controlTargets.find(point => point.name === "Hips");
        
        this.hipsControlTarget = hipsControl;
        chainObjects.push(new ChainObject("Spine", "Head", headControl));
        chainObjects.push(new ChainObject("LeftArm", "LeftHand", leftArmControl));
        chainObjects.push(new ChainObject("RightArm", "RightHand", rightArmControl));
        chainObjects.push(new ChainObject("LeftUpLeg", "LeftFoot", leftLegControl));
        chainObjects.push(new ChainObject("RightUpLeg", "RightFoot", rightLegControl));
        this.controlTargets = [headControl, leftArmControl, rightArmControl, leftLegControl, rightLegControl, hipsControl];
        //Fixing female-adult spine deformation
        if(rigMesh.name === "female-adult-meso")
        {
            rigMesh.skeleton.bones[2].rotation.set(0, 0, 0);
            rigMesh.skeleton.bones[2].updateMatrix();
            rigMesh.skeleton.bones[2].updateMatrixWorld(true, true);
        }
       
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
                    //this.hipsControlTarget.setBone(object);
                    setZDirecion(object, new THREE.Vector3(0, 0, 1));
                    //rigMesh.bind(rigMesh.skeleton)

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
                            target = chainObject.controlTarget;
                            chainObject.isChainObjectStarted = false;
                            //chainObject.controlTarget.setBone(object);
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
        let hipsTarget = this.hipsControlTarget;
        // Sets back position when offset is not changing
        // When we are changing back position offset between hips and back shouldn't be applied
        if(!this.applyingOffset && this.hipsMouseDown)
        {
            let backTarget = this.chainObjects[0].controlTarget;

            let hipsPosition = hipsTarget.position.clone();
            hipsTarget.parent.localToWorld(hipsPosition);
            backTarget.parent.worldToLocal(hipsPosition);
            let result = hipsPosition.add(this.backOffset);
            backTarget.position.copy(result);
        }
    }

    //#endregion

    //#region Internal methods
    getTargetForSolve()
    {
        let controlTargets = this.controlTargets;
        for(let i = 1; i < controlTargets.length; i++)
        {
            let target = controlTargets[i];
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
        this.calculteBackOffset();
    }

    // Calculates back's offset in order to move with hips
    calculteBackOffset()
    {
        let backPosition = this.chainObjects[0].controlTarget.position.clone();
        let hipsPosition = this.hipsControlTarget.position.clone();
        this.backOffset = backPosition.sub(hipsPosition);
    }
    //#endregion
}

module.exports =  XrIkObject;
