const THREE = require("three");
const HelperBonesPool = require("./HelperBonesPool");
require('./GPUPickers/utils/Object3dExtension');
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
            this.selectedBoneColor = new THREE.Color(0xffffff)
            this.userData.type = "BonesHelper"
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
        // Returns current in-use bones
        // The logic behind initialize is that it called once for new object
        // So we need to release previous Character bones and initialize new ones
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
        let inverseWorldMatrix = null;
        for(let i = 0, n = bones.length; i < n; i++)
        {
            bone = bones[i];
            if(bone.children.length === 0 )
            {
                continue;
            }
            if(i === 0)
            {
                inverseWorldMatrix = bone.parent.getInverseMatrixWorld();
            }
            helpingBone = this.helperBonesPool.takeBone();
            this.setHelpingBone(inverseWorldMatrix, helpingBone, bone);

            helpingBone.name = bone.name;
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
            this.setHelpingBone(inverseWorldMatrix, helpingBone, originalBone);
            this.helperBonesPool.updateInstancedBone(helpingBone);
        }
    }

    // Private method
    setHelpingBone(originalInverseMatrix, helpingBone, originalBone)
    {
        let size = 0;
        let thickness = 0;
        // Extracts original bone matrx from parents matrix
        // So to take it world position in world space
        boneMatrix.multiplyMatrices( originalInverseMatrix, originalBone.matrixWorld );
        helpingBone.position.setFromMatrixPosition(boneMatrix);
        helpingBone.quaternion.setFromRotationMatrix(boneMatrix);

        if(originalBone.children.length !== 0)
        {
            // Extracts child bone matrx from parents matrix
            // So to take it world position in world space
            let childBones = originalBone.children.filter(b => b.type === "Bone")
            if(childBones.length === 0) return
            boneMatrix.multiplyMatrices( originalInverseMatrix, childBones[childBones.length - 1].matrixWorld );
            reusableVector.setFromMatrixPosition(boneMatrix);
            size = helpingBone.position.distanceTo(reusableVector);

            thickness = Math.min(Math.max(size * 0.8, 0.07), 0.20);
            thickness = Math.min(thickness, size * 3);

            helpingBone.scale.set(thickness * originalBone.scale.x, size * originalBone.scale.y, thickness * originalBone.scale.z);
        }
        helpingBone.updateMatrix();
    }

    changeBoneColor(bone, color)
    {
        let bonesRelation = this.helpingBonesRelation.find(object => object.originalBone.uuid === bone.uuid)
        if(!bonesRelation)
        {
            return;
        }
        let helpingBone = bonesRelation.helpingBone;
        this.helperBonesPool.changeBoneColor(helpingBone, color);
    }

    selectBone(bone)
    {
        this.resetSelection();
        this.selectedBone = bone;
        this.changeBoneColor(bone, this.selectedBoneColor);
    }

    resetSelection()
    {
        if(this.selectedBone)
        {
            this.changeBoneColor(this.selectedBone, this.helperBonesPool.defaultColor);
            this.selectedBone = null;
        }
    }

    updateMatrixWorld(force)
    {
        if(this.parent && this.matrixAutoUpdate)
        {
            super.updateMatrixWorld(force);
            this.update();
        }
    }

    clone() {

    }

    get isSelected()
    {
        return this.parent ? true : false
    }

    raycast(raycaster, intersects)
    {
        if(!this.isSelected)
        {
            intersects = [];
            return;
        }
        let results = raycaster.intersectObjects(this.bonesGroup.children);
        for (let result of results)
        {
          result.bone = this.helpingBonesRelation.find(object => object.helpingBone.id === result.object.id).originalBone;
          intersects.push(result);
        }
    }
}
module.exports = BonesHelper;
