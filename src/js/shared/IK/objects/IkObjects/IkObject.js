const {IK, IKJoint}  = require("../../core/three-ik");
const THREE = require( "three");
const {setZDirecion} = require( "../../utils/axisUtils");
const ChainObject = require( "./ChainObject");
const SkeletonUtils = require("../../utils/SkeletonUtils");
const IKSwitcher = require("./IkSwitcher");
const ResourceManager = require("../../ResourceManager");
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
        this.chainObjects = {}
        this.resourceManager = ResourceManager.getInstance();
        this.backOffset = new THREE.Vector3();
    }
    
    //#region External Methods
    // Takes skeleton and target for it's limbs
    initObject(scene, objectSkeleton, controlTargets)
    {
        this.backOffset = new THREE.Vector3();
        this.ik = new IK();
        this.scene = scene;
        let chains = [];
        objectSkeleton.updateMatrixWorld(true);
        let clonedSkeleton
        try {

            let ikHelper = objectSkeleton.children.find(child => child.userData.type === "IkHelper");
            if(ikHelper) objectSkeleton.remove(ikHelper);
            let bonesHelper = objectSkeleton.children.find(child => child.userData.type === "BonesHelper");
            if(bonesHelper) objectSkeleton.remove(bonesHelper);
            clonedSkeleton = SkeletonUtils.clone(objectSkeleton);
            if(ikHelper) objectSkeleton.add(ikHelper);
            if(bonesHelper) objectSkeleton.add(bonesHelper);
        }
        catch(exception) {
            return 
        }
        this.clonedObject = clonedSkeleton;
        this.originalObject = objectSkeleton;
        this.ikSwitcher = new IKSwitcher(objectSkeleton, clonedSkeleton);
        this.rigMesh = clonedSkeleton.getObjectByProperty("type", "SkinnedMesh");
        this.originalMesh = objectSkeleton.getObjectByProperty("type", "SkinnedMesh");
        this.controlTargets = controlTargets;
        this.addParentToControl(objectSkeleton.uuid);

        this.hipsControlTarget = controlTargets[0];
        controlTargets[0].target.userData.name = "Hips";
        this.chainObjects["Head"] = new ChainObject("Spine", "Head", controlTargets[1]);
        this.chainObjects['LeftHand'] = new ChainObject("LeftArm", "LeftHand", controlTargets[2]);
        this.chainObjects['RightHand'] = new ChainObject("RightArm", "RightHand", controlTargets[3]);
        this.chainObjects['LeftFoot'] = new ChainObject("LeftUpLeg", "LeftFoot", controlTargets[4]);
        this.chainObjects['RightFoot'] = new ChainObject("RightUpLeg", "RightFoot", controlTargets[5]);

        this.chainObjects["Head"].controlTarget.isRotationLocked = true;
        this.chainObjects["LeftFoot"].controlTarget.isRotationLocked = true;
        this.chainObjects["RightFoot"].controlTarget.isRotationLocked = true;
        
        //Fixing female-adult spine deformation
        if(this.rigMesh.name === "female-adult-meso")
        {
            this.rigMesh.skeleton.bones[2].rotation.set(0, 0, 0);
            this.rigMesh.skeleton.bones[2].updateMatrix();
            this.rigMesh.skeleton.bones[2].updateMatrixWorld(true, true);
        }
        // Goes through all scene objects
        initializeChainObject(this, chains);
        // Goes through list of constraints and adds it to IK
        chains.forEach((chain) =>
        {
            this.ik.add(chain);
        });
        this.ikSwitcher.ikBonesName.push("Hips");
        this.ikSwitcher.recalculateDifference();
        this.ikSwitcher.calculateRelativeAngle();
    }

    get chainObjectsValues()
    {
        return Object.values(this.chainObjects);
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
        // Sets back position when offset is not changing
        // When we are changing back position offset between hips and back shouldn't be applied
        if(!this.applyingOffset && this.hipsMouseDown)
        {
            let hipsTarget = this.hipsControlTarget.target;
            let backTarget = this.chainObjects["Head"].controlTarget.target;
            let hipsPosition = this.resourceManager.getVector3();
            hipsTarget.getWorldPosition(hipsPosition);
            let result = hipsPosition.add(this.backOffset);
            backTarget.parent.worldToLocal(hipsPosition);
            backTarget.position.copy(result);
            this.resourceManager.release(hipsPosition);
        }
    }

    // Removes ikObject's all elements from scene
    // Control target consists of two things: mesh and control
    // before removed mesh should be detached from control
    removeFromScene()
    {
        let chains = this.chainObjectsValues;
        for(let i = 0; i < chains.length; i++)
        {
            let control = chains[i].controlTarget.control;
            control.detach();
        }
        this.hipsControlTarget.control.detach();
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
            if(target.isActivated === true && target.userData.name !== "Head")
            {
                return target;
            }
        }
        return null;
    }

    // Calculates back's offset in order to move with hips
    calculteBackOffset()
    {
        let backPosition = this.resourceManager.getVector3();
        let hipsPosition = this.resourceManager.getVector3();
        this.chainObjects["Head"].controlTarget.target.getWorldPosition(backPosition);
        this.hipsControlTarget.target.getWorldPosition(hipsPosition);
        this.backOffset.subVectors(backPosition, hipsPosition);
        this.resourceManager.release(backPosition);
        this.resourceManager.release(hipsPosition);
    }
    //#endregion
}

const initializeChainObject = (ikObject, chains) =>
{
    ikObject.clonedObject.traverse((object) =>
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
                ikObject.hips = object;
                ikObject.hipsControlTarget.setBone(object);
                setZDirecion(object, new THREE.Vector3(0, 0, 1));
            }
            // Goes through all chain objects to find with which we are working
            ikObject.chainObjectsValues.forEach((chainObject) =>
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
                        target.userData.name = object.name;
                        chainObject.isChainObjectStarted = false;
                        chainObject.controlTarget.setBone(object);
                    }
                    ikObject.ikSwitcher.ikBonesName.push(object.name);
                    // Creates joint by passing current bone and its constraint
                    let joint = new IKJoint(object, {});
                    // Adds joint to chain and sets target
                    chain.add(joint, {target});
                }
            });
        }
    });
}

module.exports =  IkObject;
