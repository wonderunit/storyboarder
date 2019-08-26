const THREE = require("three");
const HelperBonesPool = require("./HelperBonesPool");
require('../../../shot-generator/ik/utils/Object3dExtension');
let instance = null;
let boneMatrix = new THREE.Matrix4();
let reusableVector = new THREE.Vector3();
class BonesHelper extends THREE.Object3D
{
    constructor(boneMesh)
    {
        super();
        if(!instance)
        {
            instance = this;
            instance.helperBonesPool = new HelperBonesPool(300, boneMesh);
            this.helpingBonesRelation = [];
            this.add(this.helperBonesPool.instancedMesh);
            this.bonesGroup = new THREE.Group();
            this.add(this.bonesGroup)
            this.intializedSkinnedMeshUuid = null;
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
        if(this.intializedSkinnedMeshUuid && this.intializedSkinnedMeshUuid === skinnedMesh.uuid)
        {
            return;
        }
        this.intializedSkinnedMeshUuid = skinnedMesh.uuid;
        if(this.bonesGroup.children.length > 0)
        {
            this.helperBonesPool.returnBones(this.bonesGroup.children);
            this.helpingBonesRelation = [];
            while(this.bonesGroup.children.length !== 0)
            {
                this.bonesGroup.remove(this.bonesGroup.children[0]);
            }
        }
        let bones = skinnedMesh.skeleton.bones;
        let bone = null;
        let helpingBone = null;
        let size = 0;
        let thickness = 0;
        let inverseWorldMatrix = null;
        let boneMatrix = new THREE.Matrix4();
        for(let i = 0, n = bones.length; i < n; i++)
        {
            bone = bones[i];
            if(bone.children.length === 0)
            {
                continue;
            }
            if(i === 0)
            {
                inverseWorldMatrix = bone.parent.getInverseMatrixWorld();
            }
            helpingBone = this.helperBonesPool.takeBone();
            boneMatrix.multiplyMatrices( inverseWorldMatrix, bone.matrixWorld )
            helpingBone.position.setFromMatrixPosition(boneMatrix);
            helpingBone.quaternion.setFromRotationMatrix(boneMatrix);

            bone.children[bone.children.length - 1].getWorldPosition(reusableVector);
            size = bone.worldPosition().distanceTo(reusableVector);

            thickness = Math.min(Math.max(size * 0.8, 0.07), 0.20);
            thickness = Math.min(thickness, size * 3);

            helpingBone.scale.set(thickness, size, thickness);
            this.helperBonesPool.updateInstancedBone(helpingBone);
            this.helpingBonesRelation.push({helpingBone:helpingBone, originalBone:bone});
            this.bonesGroup.add(helpingBone)
        }
    }

    update()
    {
        let inverseWorldMatrix = null;
        for(let i = 0, n = this.helpingBonesRelation.length; i < n; i++)
        {
            let {helpingBone, originalBone} = this.helpingBonesRelation[i];
            if(i === 0)
            {
                inverseWorldMatrix = this.bonesGroup.getInverseMatrixWorld();
            }
            boneMatrix.multiplyMatrices( inverseWorldMatrix, originalBone.matrixWorld )
            helpingBone.position.setFromMatrixPosition(boneMatrix);
            helpingBone.quaternion.setFromRotationMatrix(boneMatrix);

            helpingBone.updateMatrix();
            this.helperBonesPool.updateInstancedBone(helpingBone);
        }
    }

    changeBoneColor(bone, color)
    {
        let helpingBone = this.helpingBonesRelation.find(object => object.originalBone.uuid === bone.uuid).helpingBone;

        if(!helpingBone)
        {
            return;
        }
        this.helperBonesPool.changeBoneColor(helpingBone, color);
    }

    updateMatrixWorld(force)
    {
        if(this.parent)
        {
            super.updateMatrixWorld(force);
            this.update();
        }
    }

    raycast(raycaster, intersects)
    {
        let results = raycaster.intersectObjects(this.bonesGroup.children);
        for (let result of results)
        {
          result.bone = this.helpingBonesRelation.find(object => object.helpingBone.id === result.object.id).originalBone;
          intersects.push(result);
        }
    }
}
module.exports = BonesHelper;
