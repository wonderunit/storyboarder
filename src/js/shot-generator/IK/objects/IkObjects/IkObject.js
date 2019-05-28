const {IK, IKJoint}  = require("../../core/three-ik");
const THREE = require( "three");
const setZForward = require( "../../utils/axisUtils");
const ChainObject = require( "./ChainObject");

// IKObject is class which applies ik onto skeleton
class IkObject
{
    constructor()
    {
        this.applyingOffset = false;
        this.neckRotation = null;
        this.enableIk = true;
        this.controlTargets = [];
    }

    // Takes skeleton and target for it's limbs
    initObject(scene, objectSkeleton, skinnedMesh, ...controlTarget)
    {
        this.ik = new IK();
        let chains = [];
        this.rigMesh = skinnedMesh;
        let rigMesh = this.rigMesh;
        let skeleton = null;
        this.controlTargets = controlTarget[0];

        let chainObjects = [];
        this.chainObjects = chainObjects;
        this.hipsControlTarget = this.controlTargets[5];

        chainObjects.push(new ChainObject("Spine", "Head", this.controlTargets[0]));
        console.log(scene);
        chainObjects.push(new ChainObject("LeftArm", "LeftHand", this.controlTargets[1]));
        chainObjects.push(new ChainObject("RightArm", "RightHand", this.controlTargets[2]));
        chainObjects.push(new ChainObject("LeftUpLeg", "LeftFoot", this.controlTargets[3]));
        chainObjects.push(new ChainObject("RightUpLeg", "RightFoot", this.controlTargets[4]));
        // Goes through all scene objects
        objectSkeleton.traverse((object) =>
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


                    //skeleton.quaternion.inverse();

                }



                // Flips a model's forward from -Z to +Z
                // By default Models axis is -Z while Three ik works with +Z
                if(object.name === "Hips")
                {
                    this.hips = object;
                    object.quaternion.set(0, 0, 0, 1);
                    object.updateWorldMatrix(true, false);
                    console.log(object);
                    //console.log(skeleton);
                    //rigMesh.bind(rigMesh.skeleton);
                    //object.rotateX(-1.5708);
                    //object.updateWorldMatrix(true, true);
                    setZForward(object);

                    //console.log(rigMesh);
                    //rigMesh.geometry.vertices.forEach((vertice) =>
                    //{
                    //    console.log(vertice);
                    //});
                    //
                   //let childQuaternion = skeleton.children[0].quaternion;
                   //skeleton.children[1].quaternion.set(-childQuaternion.x, -childQuaternion.z, -childQuaternion.y, childQuaternion.w);
                   //skeleton.children[1].rotateX(Math.PI/2);
                   //skeleton.children[1].updateWorldMatrix();
                   // rigMesh.bindMode = "detached";
                    rigMesh.bind(rigMesh.skeleton);
                    //rigMesh.geometry.rotateX(1.5708);


                    //rigMesh.geometry.updateWorldMatrix(true, true);
                    let objectWorld = new THREE.Vector3();
                    object.getWorldPosition(objectWorld);
                    this.hipsControlTarget.target.position.copy(objectWorld);
                }
                else {
                    let objectQuat = object.quaternion;

                    //objectQuat.multiply(skeleton.quaternion);
                    // objectQuat.set(objectQuat.x, objectQuat.y, objectQuat.z, objectQuat.w);
                    //object.rotateX(-1.5708);
                    //object.updateWorldMatrix(true, false);
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

                        // Creates joint by passing current bone and its constraint
                        let joint = new IKJoint(object, {});
                        let globaPose = new THREE.Vector3();
                        // Adds joint to chain and sets target
                        chain.add(joint, {target});
                    }
                });


            }
        });
        //rigMesh.bind(rigMesh.skeleton);

        // Goes through list of constraints and adds it to IK
        chains.forEach((chain) =>
        {
            this.ik.add(chain);
        });
        // Sets skeleton helper for showing bones
        this.skeletonHelper = new THREE.SkeletonHelper( skeleton );
        // Sets line width of skeleton helper
        this.skeletonHelper.material.linewidth = 3;
        // Adds skeleton helper to scene
        scene.add( this.skeletonHelper );
       // this.calculteBackOffset();

    }

    reinitialize(worldMatrix)
    {
        let chainObjects = this.chainObjects;
        let matrix = new THREE.Matrix4().getInverse(worldMatrix);

        for(let i = 0; i < chainObjects.length; i++)
        {
            let chain = chainObjects[i].chain;
            if(i === 0)
            {
                let object = this.hips;
                //setZForward(object);
                console.log(object);
                /*let scale = object.scale;
                scale.set(scale.x, scale.y, -scale.z);*/
                //this.rigMesh.bind(this.rigMesh.skeleton);
            }

            chain.joints[chain.joints.length - 1].bone.getWorldPosition(chainObjects[i].controlTarget.target.position);
            chain.reinitializeJoints();



        }
        this.hips.getWorldPosition(this.hipsControlTarget.target.position);
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
        if(this.enableIk)
        {
            // Solves the inverse kinematic of object
            this.ik.solve();
        }
       // this.lateUpdate();
    }

    // Updates which is called last after all stuff in loop has been done
    // Fires after ik solver in order to apply custom changes to models
    // Ik solver overrides all changes if applied before it's fired
    lateUpdate()
    {
       // let hipsTarget = this.hipsControlTarget.target;
       // // Sets back position when offset is not changing
       // // When we are changing back position offset between hips and back shouldn't be applied
       // if(!this.applyingOffset)
       // {
       //     let backTarget = this.chainObjects[0].controlTarget.target;
       //     let hipsPosition = hipsTarget.position.clone();
       //     let result = hipsPosition.add(this.backOffset);
       //     backTarget.position.copy(result);
       // }
       // // Follows hips target
       // this.hips.position.copy(hipsTarget.position);
    }

    isInitialized()
    {
        return this.ik === undefined ? false : true;
    }

    removeFromScene(scene)
    {
        this.chainObjects.forEach((chainObject) =>
        {
            let control = chainObject.controlTarget.control;
            let movingTarget = chainObject.controlTarget.movingTarget;
            control.detach(movingTarget);
            scene.remove(movingTarget);
            scene.remove(control);
        });
        this.hipsControlTarget.control.detach(this.hipsControlTarget.movingTarget);
        scene.remove(this.hipsControlTarget.movingTarget);
        scene.remove(this.hipsControlTarget.control);
        scene.remove(this.skeletonHelper);
    }
}
module.exports =  IkObject;
