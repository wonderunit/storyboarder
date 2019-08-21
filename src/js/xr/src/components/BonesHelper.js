const THREE = require("three");
const HelperBonesPool = require("../utils/HelperBonesPool");

let instance = null;
class BonesHelper extends THREE.Object3D
{
    constructor(boneMesh)
    {
        super();
        if(!instance)
        {  
            instance = this;
            instance.helperBonesPool = new HelperBonesPool(300, boneMesh);
            instance.helpingBones = [];
            this.helpingBonesRelation = [];
            instance.reusableVector = new THREE.Vector3();
            instance.currentSkinnedMesh = null;
            this.add(this.helperBonesPool.instancedMesh);
            /// Random color switching stuff 
            // TODO(): Remove it
            this.updateColorCount = 30;
            this.currentUpdateColorCount = 0;
            this.color = new THREE.Color();
            this.selectedBone = null;
        }
        return instance;
    }

    static getInstance(boneMesh)
    {
        return instance ? instance : new BonesHelper(boneMesh);
    }

    get instancedMesh()
    {
        return this.helperBonesPool.instancedMesh;
    }

    // Intializes BonesHelper's bones position, rotation and stuff like that
    // And creates InstancedMesh 
    initialize(skinnedMesh)
    {
        if(this.helpingBones.length > 0)
        {
            this.helperBonesPool.returnBones(this.helpingBones);
            this.helpingBones = [];
            this.helpingBonesRelation = [];
        }
        this.currentSkinnedMesh = skinnedMesh;
        let bones = skinnedMesh.skeleton.bones;
        let bone = null;
        let helpingBone = null;
        let childPos = this.reusableVector;
        let size = 0;
        let thickness = 0;
        for(let i = 0, n = bones.length; i < n; i++)
        {
            bone = bones[i];
            if(bone.children.length === 0) 
            {
                continue;
            }
            helpingBone = this.helperBonesPool.takeBone();
            childPos = this.reusableVector;
            bone.getWorldPosition(helpingBone.position);
            bone.getWorldQuaternion(helpingBone.quaternion);
            bone.children[bone.children.length - 1].getWorldPosition(childPos);
            size = helpingBone.position.distanceTo(childPos);
  
            thickness = Math.min(Math.max(size * 0.8, 0.07), 0.20);
            thickness = Math.min(thickness, size * 3);

            helpingBone.scale.set(thickness, size, thickness);
            this.helperBonesPool.updateInstancedBone(helpingBone);
            this.helpingBonesRelation.push({helpingBone:helpingBone, originalBone:bone});
            this.helpingBones.push(helpingBone);
        }
    }

    update()
    {
        //let bones = this.currentSkinnedMesh.skeleton.bones;
        for(let i = 0, n =  this.helpingBonesRelation.length; i < n; i++)
        {
            let {helpingBone, originalBone} = this.helpingBonesRelation[i];
            originalBone.getWorldPosition(helpingBone.position);
            originalBone.getWorldQuaternion(helpingBone.quaternion);
            this.helperBonesPool.updateInstancedBone(helpingBone);
        }
    }
    // Random color switching stuff 
    // TODO(): Remove it
    updateMatrixWorld(force)
    {
        if(this.currentUpdateColorCount === this.updateColorCount)
        {
            if(this.selectedBone)
            {
                this.instancedMesh.setColorAt( this.selectedBone.id , this.helperBonesPool.defaultColor );
            }
            let randomBone = Math.floor(Math.random() * Math.floor(this.helpingBones.length)) ;
            let helpingBone = this.helpingBones[randomBone] !== this.selectedBone ? this.helpingBones[randomBone] : this.helpingBones[randomBone + 1] ? this.helpingBones[randomBone + 1] : this.helpingBones[randomBone - 1];
            this.selectedBone = helpingBone;
            this.color.setRGB(Math.random() * 256, Math.random() * 256, Math.random() * 256);
            this.instancedMesh.setColorAt( helpingBone.userData.id , this.color);
            this.instancedMesh.needsUpdate("colors");
            this.currentUpdateColorCount = 0;
        }
        this.currentUpdateColorCount++;
        super.updateMatrixWorld(force);
    }

}
module.exports = BonesHelper;
