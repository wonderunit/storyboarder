const {IK, IKJoint, IKChain}  = require("../../core/three-ik");
const THREE = require( "three");
const SkeletonUtils = require("../../utils/SkeletonUtils");
const {setZDirecion} = require( "../../utils/axisUtils");
const IKSwitcher = require("./IkSwitcher");
const TargetControl = require("../TargetControl");
const ChainObject = require( "./ChainObject");
const ControlTargetSelection = require("../ControlTargetSelection");
require("../../utils/Object3dExtension");

class IkCustomObject
{
    constructor()
    {
        this.ik = new IK();
        this.isEnabledIk = false;
        this.hipsMoving = false;
        this.hipsMouseDown = false;
        this.chainObjects = [];
        this.controlTargetSelection = null;
        this.controlTargets = []
    }

    initObject(scene, objectSkeleton, camera, domElement)
    {
        this.ik = new IK();
        this.camera = camera;
        this.domElement = domElement;
        this.scene = scene;
        let clonedSkeleton = SkeletonUtils.clone(objectSkeleton);
        this.clonedObject = clonedSkeleton;
        this.originalObject = objectSkeleton;
        this.ikSwitcher = new IKSwitcher(objectSkeleton, clonedSkeleton);
        let clonedMesh = clonedSkeleton.children.filter(child => child.type === "SkinnedMesh")[0];
        let bone = clonedMesh.skeleton.bones[0];
        this.hips = bone;
        setZDirecion(bone, new THREE.Vector3(0, 0, 1));
        this.initChain(bone, null);

        //#region Hips control point
        this.hipsControlTarget = this.AddTransformationControl(new THREE.Vector3(0, 0, 0), this.camera, this.domElement, this.scene, bone.name);
        this.hipsControlTarget.setBone(bone);

        let hipsControl = this.hipsControlTarget.control;
        hipsControl.addEventListener("pointerdown", this.onHipsControlMouseDown, false);
        hipsControl.addEventListener("pointerup", this.onHipsControlMouseUp, false);
        //#endregion
        this.ikSwitcher.recalculateDifference();
        this.ikSwitcher.calculateRelativeAngle();
        this.controlTargets = this.chainObjects.map(chain => chain.controlTarget);
        this.controlTargets.unshift(this.hipsControlTarget);
        this.controlTargetSelection = new ControlTargetSelection(domElement, scene, camera, this.controlTargets);
        
       
        this.skeletonHelper = new THREE.SkeletonHelper( bone.parent );
        // Sets line width of skeleton helper
        this.skeletonHelper.material.linewidth = 7;
        this.addParentToControl(objectSkeleton.uuid);
        // Adds skeleton helper to scene
        //scene.add( this.skeletonHelper );
    }

    initChain(bone, chainObject)
    {
        if(!chainObject)
        {
            let ikChainObject = new ChainObject("", "");
            chainObject = ikChainObject;
        }
        else
        {
            let chain = chainObject.chain;
           
            let controlTarget = null;
            let target = null;
            if(bone.children.length === 0)
            {
               if(!chain.joints || chain.joints.length === 0)
               {
                    return;
               }
               controlTarget = this.AddTransformationControl(new THREE.Vector3(0, 0, 0), this.camera, this.domElement, this.scene, bone.name);
               controlTarget.setBone(bone);
               chainObject.controlTarget = controlTarget;
               chainObject.controlName = bone.name;
               controlTarget.control.addEventListener("pointerdown", this.onControlsMouseDown);
               controlTarget.control.addEventListener("pointerup", this.onControlsMouseUp);
               target = controlTarget.target;
            }
            // Creates joint by passing current bone and its constraint
            let joint = new IKJoint(bone, {});
            // Adds joint to chain and sets target
            chain.add(joint, {target});
            if(controlTarget)
            {
                this.ik.add(chain);
                this.chainObjects.push(chainObject);
                return;
            }
        }
        this.ikSwitcher.ikBonesName.push(bone.name);
        for(let i = 0; i < bone.children.length; i++)
        {
            let ikBone = bone.children[i];
            if(i === 0)
            {
                this.initChain(ikBone, chainObject);
            }
            else
            {
               this.initChain(ikBone, null);
            }
        }
    }

    addOriginControlPoint(bone)
    {

    }

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
            if(IK.firstRun)
            {
                this.ikSwitcher.recalculateDifference();
            }
        }

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
            this.resetTargets()
            this.ikSwitcher.applyToIk();
        }
        else
        {
            this.ikSwitcher.applyChangesToOriginal();
            this.updateReact();
        }
        this.lateUpdate();
    }

    lateUpdate()
    {
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

    //#region neccessary methods
    removeFromScene()
    {
        let chainObject = this.chainObjects;
        for (let i = 0; i < chainObject.length; i++)
        {
            let control = chainObject[i].controlTarget.control;
            control.removeEventListener("pointerdown", this.onControlsMouseDown);
            control.removeEventListener("pointerup", this.onControlsMouseUp);
        }
        let hipsControl = this.hipsControlTarget.control;
        hipsControl.removeEventListener("pointerdown", this.onHipsControlMouseDown);
        hipsControl.removeEventListener("pointerup", this.onHipsControlMouseUp);
    }

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
            chain.reinitializeJoints();
        }
        this.hips.getWorldPosition(this.hipsControlTarget.target.position);
        this.ikSwitcher.applyToIk();
        let hipsTarget = this.hipsControlTarget.target;
        this.objectTargetDiff = new THREE.Vector3().subVectors(hipsTarget.position, this.originalObject.position);
        //resetTargets();
    }

    setUpControlTargetsInitialPosition()
    {

    }

    moveRagdoll()
    {
        this.clonedObject.position.copy(this.originalObject.position);
        this.clonedObject.updateMatrixWorld(true, true);
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
            let targetPosition = chainObjects[i].controlTarget.target.position;
            jointBone.getWorldPosition(targetPosition);
        }
       // this.calculteBackOffset();
    }

    AddTransformationControl(position, camera, domElement, scene, name)
    {
      let targetControl = new TargetControl(camera, domElement, name);
      targetControl.initialize(position, scene);
      return targetControl;
    }
    //#endregion
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
        //this.hipsControlTarget.control.characterId = parentId;
        //this.hipsControlTarget.target.characterId = parentId;
    }

    //#region events
    controlsMouseDown(event)
    {
        let control = event.target;
        this.isEnabledIk = true;
        control.activateTarget(true);
        if(control.mode === "rotate")
        {
            this.isRotation = true;
        }
    }

    controlsMouseUp(event)
    {
        let control = event.target;
        control.activateTarget(false);
        this.isRotation = false;
        this.isEnabledIk = false;
    }

    hipsControlMouseDown(event)
    {
        let ragdoll = this;
        ragdoll.hipsMouseDown = true;
        ragdoll.isEnabledIk = true;
        if(ragdoll.hipsControlTarget.control.mode === "rotate")
        {
            ragdoll.isEnabledIk = false;
            ragdoll.attached = true;
            ragdoll.originalObject.children[0].isRotated = true;
        }
    }

    hipsControlMouseUp(event)
    {
        let ragdoll = this;
        if(ragdoll.attached)
        {
            ragdoll.attached = false;
            ragdoll.originalObject.children[0].isRotated = false;
        }
        ragdoll.applyingOffset = false;
        ragdoll.hipsMouseDown = false;
        ragdoll.isEnabledIk = false;
    }

    onHipsControlMouseDown = event => {this.hipsControlMouseDown(event)};
    onHipsControlMouseUp = event => {this.hipsControlMouseUp(event)};

    onControlsMouseDown = event => {this.controlsMouseDown(event)};
    onControlsMouseUp = event => {this.controlsMouseUp(event)}; 
    //#endregion

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
        this.updateCharacterSkeleton(ikBones);
    }
}

module.exports = IkCustomObject;
