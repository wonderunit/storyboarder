const THREE = require('three')
require( './../../../vendor/three-instanced-mesh' )(THREE);
class HelperBonesPool
{
    constructor(poolSize, boneMesh)
    {
        this.poolSize = poolSize;
        this.avaibleBones = [];
        this.usedBones = {};
        //0x856dff
        let material = new THREE.MeshBasicMaterial({
            color: 0x856dff,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.65,
            flatShading: true});
        this.boneMesh = boneMesh;
        this.material = material;
        this.instancedMesh = new THREE.CustomInstancedMesh(boneMesh.geometry, material, poolSize, true, true, false)
        this.defaultPosition = new THREE.Vector3(5000, 5000, 5000);
        this.defaultColor = new THREE.Color(0x856dff);
        for ( var i = 0 ; i < poolSize; i ++ )
        {
            this.addBone(i);
        }
    }

    addBone(id)
    {
        let bone = this.boneMesh.clone();
        bone.material = this.material;
        bone.material.visible = false;
        bone.userData.id = id;
        this.resetBone(bone);
        bone.matrixAutoUpdate = false;
        this.avaibleBones.push(bone);
    }

    resetBone(bone)
    {
        bone.position.copy(this.defaultPosition);
        bone.rotation.set(0, 0, 0);
        bone.quaternion.set(0, 0, 0, 0);
        bone.scale.set(0, 0, 0);
        this.updateInstancedBone(bone, this.defaultColor);
    }

    changeBoneColor(bone, color)
    {
        this.instancedMesh.setColorAt(bone.userData.id, color );
        this.instancedMesh.needsUpdate("colors");
    }

    updateInstancedBone(bone, color = null)
    {
        let id = bone.userData.id;
        this.instancedMesh.setPositionAt( id , bone.position );
        this.instancedMesh.setQuaternionAt( id , bone.quaternion );
        this.instancedMesh.setScaleAt( id , bone.scale );
        if(color)
        {
            this.changeBoneColor(bone, this.defaultColor);
        }
        this.instancedMesh.needsUpdate("position");
        this.instancedMesh.needsUpdate("quaternion");
        this.instancedMesh.needsUpdate("scale");
    }

    takeBone()
    {
        if(this.avaibleBones.length === 0)
        {
            return;
        }
        let bone = this.avaibleBones.shift();
        this.usedBones[bone.userData.id] = bone;
        return bone;
    }

    returnBone(bone)
    {
        if(bone.userData.id === undefined)
        {
            return;
        }
        let usedBone = this.usedBones[bone.userData.id];
        if(!usedBone)
        {
            return;
        }
        this.resetBone(usedBone);
        this.avaibleBones.push(usedBone);
        this.usedBones[bone.userData.id] = null;
        delete this.usedBones[bone.userData.id];
    }

    takeBones(amountOfBones)
    {
        let bones = [];
        for(let i = 0; i < amountOfBones; i++)
        {
            bones.push(this.takeBone());
        }
        return bones;
    }

    returnBones(arrayOfBones)
    {
        for(let i = 0; i < arrayOfBones.length; i++)
        {
            this.returnBone(arrayOfBones[i]);
        }
    }
}

module.exports = HelperBonesPool;
